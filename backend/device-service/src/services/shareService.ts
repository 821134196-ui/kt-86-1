import { prisma } from '../config/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { canAccessDevice } from '../middleware/roles';
import { homeService } from './homeService';

export const deviceShareService = {
  async getDeviceShares(deviceId: string, userId: string) {
    const hasAccess = await canAccessDevice(userId, deviceId, true);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to view device shares');
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    return prisma.deviceShare.findMany({
      where: { deviceId },
      include: {
        user: {
          select: { id: true, email: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createDeviceShare(
    deviceId: string,
    currentUserId: string,
    data: {
      userId: string;
      canControl?: boolean;
      expiresAt?: Date;
    },
  ) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    if (device.homeId) {
      await homeService.ensureMember(device.homeId, currentUserId);
    } else {
      const hasAccess = await canAccessDevice(currentUserId, deviceId, true);
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to share this device');
      }
    }

    if (data.userId === currentUserId) {
      throw new ConflictError('Cannot share device with yourself');
    }

    const existingShare = await prisma.deviceShare.findUnique({
      where: {
        deviceId_userId: { deviceId, userId: data.userId },
      },
    });

    if (existingShare) {
      throw new ConflictError('Device already shared with this user');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    return prisma.deviceShare.create({
      data: {
        deviceId,
        userId: data.userId,
        canControl: data.canControl || false,
        expiresAt: data.expiresAt,
      },
      include: {
        user: {
          select: { id: true, email: true, username: true, avatar: true },
        },
      },
    });
  },

  async deleteDeviceShare(deviceId: string, currentUserId: string, targetUserId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    if (device.homeId) {
      await homeService.ensureMember(device.homeId, currentUserId);
    } else {
      const hasAccess = await canAccessDevice(currentUserId, deviceId, true);
      if (!hasAccess && currentUserId !== targetUserId) {
        throw new ForbiddenError('Access denied to manage device shares');
      }
    }

    const share = await prisma.deviceShare.findUnique({
      where: {
        deviceId_userId: { deviceId, userId: targetUserId },
      },
    });

    if (!share) {
      throw new NotFoundError('Device share not found');
    }

    await prisma.deviceShare.delete({
      where: {
        deviceId_userId: { deviceId, userId: targetUserId },
      },
    });
  },
};
