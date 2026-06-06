import { prisma } from '../config/prisma';
import { homeService } from './homeService';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { DeviceStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { canAccessDevice } from '../middleware/roles';
import { redisCache } from '../config/redis';

export const deviceTypeService = {
  async getAllDeviceTypes() {
    return prisma.deviceType.findMany({
      orderBy: { category: 'asc' },
    });
  },

  async getDeviceTypeById(id: string) {
    const deviceType = await prisma.deviceType.findUnique({
      where: { id },
    });

    if (!deviceType) {
      throw new NotFoundError('Device type not found');
    }

    return deviceType;
  },

  async createDeviceType(data: {
    name: string;
    category: string;
    icon?: string;
    description?: string;
    capabilities?: any[];
  }) {
    return prisma.deviceType.create({
      data,
    });
  },

  async updateDeviceType(id: string, data: {
    name?: string;
    category?: string;
    icon?: string | null;
    description?: string | null;
    capabilities?: any[];
  }) {
    const deviceType = await prisma.deviceType.findUnique({
      where: { id },
    });

    if (!deviceType) {
      throw new NotFoundError('Device type not found');
    }

    return prisma.deviceType.update({
      where: { id },
      data,
    });
  },

  async deleteDeviceType(id: string) {
    const deviceType = await prisma.deviceType.findUnique({
      where: { id },
    });

    if (!deviceType) {
      throw new NotFoundError('Device type not found');
    }

    const deviceCount = await prisma.device.count({
      where: { deviceTypeId: id },
    });

    if (deviceCount > 0) {
      throw new BadRequestError('Cannot delete device type with existing devices');
    }

    await prisma.deviceType.delete({
      where: { id },
    });
  },
};

export const deviceService = {
  async getDevices(userId: string, filters?: {
    homeId?: string;
    roomId?: string;
    deviceGroupId?: string;
    status?: DeviceStatus;
  }) {
    const where: any = {};

    if (filters?.homeId) {
      await homeService.ensureMember(filters.homeId, userId);
      where.homeId = filters.homeId;
    } else {
      const userHomes = await prisma.homeMember.findMany({
        where: { userId },
        select: { homeId: true },
      });
      const sharedDeviceIds = await prisma.deviceShare.findMany({
        where: { userId },
        select: { deviceId: true },
      });

      where.OR = [
        { homeId: { in: userHomes.map((h) => h.homeId) } },
        { id: { in: sharedDeviceIds.map((d) => d.deviceId) } },
      ];
    }

    if (filters?.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters?.deviceGroupId) {
      where.deviceGroupId = filters.deviceGroupId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return prisma.device.findMany({
      where,
      include: {
        deviceType: true,
        room: {
          select: { id: true, name: true, icon: true },
        },
        deviceGroup: {
          select: { id: true, name: true, icon: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getDeviceById(deviceId: string, userId: string) {
    const hasAccess = await canAccessDevice(userId, deviceId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this device');
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        deviceType: true,
        room: true,
        deviceGroup: true,
        home: true,
        shares: {
          include: {
            user: {
              select: { id: true, email: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    return device;
  },

  async createDevice(userId: string, data: {
    name: string;
    deviceTypeId: string;
    roomId?: string;
    deviceGroupId?: string;
    homeId?: string;
    state?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    if (data.homeId) {
      await homeService.ensureMember(data.homeId, userId);
    }

    if (data.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });
      if (!room) {
        throw new NotFoundError('Room not found');
      }
      if (data.homeId && room.homeId !== data.homeId) {
        throw new BadRequestError('Room does not belong to the specified home');
      }
    }

    if (data.deviceGroupId) {
      const group = await prisma.deviceGroup.findUnique({
        where: { id: data.deviceGroupId },
      });
      if (!group) {
        throw new NotFoundError('Device group not found');
      }
      if (data.homeId && group.homeId !== data.homeId) {
        throw new BadRequestError('Device group does not belong to the specified home');
      }
    }

    const deviceType = await prisma.deviceType.findUnique({
      where: { id: data.deviceTypeId },
    });
    if (!deviceType) {
      throw new NotFoundError('Device type not found');
    }

    return prisma.device.create({
      data: {
        name: data.name,
        deviceTypeId: data.deviceTypeId,
        roomId: data.roomId,
        deviceGroupId: data.deviceGroupId,
        homeId: data.homeId,
        state: data.state || {},
        metadata: data.metadata || {},
      },
      include: {
        deviceType: true,
      },
    });
  },

  async updateDevice(deviceId: string, userId: string, data: {
    name?: string;
    roomId?: string | null;
    deviceGroupId?: string | null;
    state?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: DeviceStatus;
  }) {
    const hasAccess = await canAccessDevice(userId, deviceId, true);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this device');
    }

    const existing = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!existing) {
      throw new NotFoundError('Device not found');
    }

    const updateData: any = { ...data };

    if (data.status === DeviceStatus.ONLINE) {
      updateData.lastOnline = new Date();
    }

    return prisma.device.update({
      where: { id: deviceId },
      data: updateData,
      include: {
        deviceType: true,
      },
    });
  },

  async deleteDevice(deviceId: string, userId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    if (device.homeId) {
      await homeService.ensureMember(device.homeId, userId);
    } else {
      const hasAccess = await canAccessDevice(userId, deviceId, true);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to this device');
      }
    }

    await prisma.device.delete({
      where: { id: deviceId },
    });
  },

  async sendCommand(deviceId: string, userId: string, command: {
    action: string;
    params?: Record<string, any>;
  }) {
    const hasAccess = await canAccessDevice(userId, deviceId, true);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to control this device');
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { deviceType: true },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    logger.info(`Command sent to device ${deviceId}: ${command.action}`, command.params);

    const commandId = `cmd:${deviceId}:${Date.now()}`;
    await redisCache.set(
      `command:${commandId}`,
      JSON.stringify({
        deviceId,
        action: command.action,
        params: command.params || {},
        timestamp: new Date().toISOString(),
      }),
      3600,
    );

    const currentState = (device.state as Record<string, any>) || {};
    const newState = { ...currentState, ...command.params };

    await prisma.device.update({
      where: { id: deviceId },
      data: { state: newState },
    });

    return {
      commandId,
      deviceId,
      action: command.action,
      params: command.params || {},
      state: newState,
      timestamp: new Date().toISOString(),
    };
  },

  async updateDeviceStatus(deviceId: string, status: DeviceStatus) {
    const data: any = { status };
    if (status === DeviceStatus.ONLINE) {
      data.lastOnline = new Date();
    }

    return prisma.device.update({
      where: { id: deviceId },
      data,
    });
  },
};
