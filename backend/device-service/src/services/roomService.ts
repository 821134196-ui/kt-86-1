import { prisma } from '../config/prisma';
import { homeService } from './homeService';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export const roomService = {
  async getRoomsByHome(homeId: string, userId: string) {
    await homeService.ensureMember(homeId, userId);

    return prisma.room.findMany({
      where: { homeId },
      include: {
        _count: {
          select: { devices: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getRoomById(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        devices: true,
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    await homeService.ensureMember(room.homeId, userId);

    return room;
  },

  async createRoom(userId: string, data: { name: string; homeId: string; icon?: string }) {
    await homeService.ensureMember(data.homeId, userId);

    return prisma.room.create({
      data: {
        name: data.name,
        homeId: data.homeId,
        icon: data.icon,
      },
    });
  },

  async updateRoom(roomId: string, userId: string, data: { name?: string; icon?: string | null }) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    await homeService.ensureMember(room.homeId, userId);

    return prisma.room.update({
      where: { id: roomId },
      data,
    });
  },

  async deleteRoom(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    await homeService.ensureMember(room.homeId, userId);

    await prisma.room.delete({
      where: { id: roomId },
    });
  },
};

export const deviceGroupService = {
  async getDeviceGroupsByHome(homeId: string, userId: string) {
    await homeService.ensureMember(homeId, userId);

    return prisma.deviceGroup.findMany({
      where: { homeId },
      include: {
        _count: {
          select: { devices: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getDeviceGroupById(groupId: string, userId: string) {
    const group = await prisma.deviceGroup.findUnique({
      where: { id: groupId },
      include: {
        devices: true,
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Device group not found');
    }

    await homeService.ensureMember(group.homeId, userId);

    return group;
  },

  async createDeviceGroup(userId: string, data: { name: string; homeId: string; icon?: string }) {
    await homeService.ensureMember(data.homeId, userId);

    return prisma.deviceGroup.create({
      data: {
        name: data.name,
        homeId: data.homeId,
        icon: data.icon,
      },
    });
  },

  async updateDeviceGroup(groupId: string, userId: string, data: { name?: string; icon?: string | null }) {
    const group = await prisma.deviceGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Device group not found');
    }

    await homeService.ensureMember(group.homeId, userId);

    return prisma.deviceGroup.update({
      where: { id: groupId },
      data,
    });
  },

  async deleteDeviceGroup(groupId: string, userId: string) {
    const group = await prisma.deviceGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundError('Device group not found');
    }

    await homeService.ensureMember(group.homeId, userId);

    await prisma.deviceGroup.delete({
      where: { id: groupId },
    });
  },
};
