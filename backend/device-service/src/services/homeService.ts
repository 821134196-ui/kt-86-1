import { prisma } from '../config/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

export const homeService = {
  async getUserHomes(userId: string) {
    const memberships = await prisma.homeMember.findMany({
      where: { userId },
      include: {
        home: {
          include: {
            _count: {
              select: { members: true, rooms: true, deviceGroups: true },
            },
          },
        },
        role: true,
      },
    });

    return memberships.map((m) => ({
      ...m.home,
      role: m.role,
      memberCount: m.home._count.members,
      roomCount: m.home._count.rooms,
      deviceGroupCount: m.home._count.deviceGroups,
    }));
  },

  async getHomeById(homeId: string, userId: string) {
    const membership = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: { homeId, userId },
      },
      include: {
        home: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, email: true, username: true, avatar: true },
                },
              },
            },
            rooms: true,
            deviceGroups: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundError('Home not found or access denied');
    }

    return {
      ...membership.home,
      currentUserRole: membership.role,
    };
  },

  async createHome(userId: string, data: { name: string; description?: string; avatar?: string }) {
    const home = await prisma.home.create({
      data: {
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        members: {
          create: {
            userId,
            role: Role.ADMIN,
          },
        },
      },
    });

    return home;
  },

  async updateHome(homeId: string, userId: string, data: { name?: string; description?: string | null; avatar?: string | null }) {
    await this.ensureAdmin(homeId, userId);

    const home = await prisma.home.update({
      where: { id: homeId },
      data,
    });

    return home;
  },

  async deleteHome(homeId: string, userId: string) {
    await this.ensureAdmin(homeId, userId);

    await prisma.home.delete({
      where: { id: homeId },
    });
  },

  async ensureAdmin(homeId: string, userId: string) {
    const membership = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: { homeId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundError('Home not found or access denied');
    }

    if (membership.role !== Role.ADMIN) {
      throw new ForbiddenError('Admin role required');
    }
  },

  async ensureMember(homeId: string, userId: string) {
    const membership = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: { homeId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundError('Home not found or access denied');
    }

    return membership;
  },
};

export const homeMemberService = {
  async getMembers(homeId: string, userId: string) {
    await homeService.ensureMember(homeId, userId);

    const members = await prisma.homeMember.findMany({
      where: { homeId },
      include: {
        user: {
          select: { id: true, email: true, username: true, avatar: true, createdAt: true },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }));
  },

  async addMember(homeId: string, currentUserId: string, data: { userId: string; role: Role }) {
    await homeService.ensureAdmin(homeId, currentUserId);

    const existing = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: { homeId, userId: data.userId },
      },
    });

    if (existing) {
      throw new ConflictError('User is already a member of this home');
    }

    const member = await prisma.homeMember.create({
      data: {
        homeId,
        userId: data.userId,
        role: data.role,
      },
      include: {
        user: {
          select: { id: true, email: true, username: true, avatar: true },
        },
      },
    });

    return member;
  },

  async removeMember(homeId: string, currentUserId: string, targetUserId: string) {
    await homeService.ensureAdmin(homeId, currentUserId);

    if (currentUserId === targetUserId) {
      throw new ForbiddenError('Cannot remove yourself from home');
    }

    await prisma.homeMember.delete({
      where: {
        homeId_userId: { homeId, userId: targetUserId },
      },
    });
  },
};
