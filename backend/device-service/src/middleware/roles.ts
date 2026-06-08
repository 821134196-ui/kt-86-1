import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../types';

const roleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 3,
  [Role.MEMBER]: 2,
  [Role.GUEST]: 1,
};

export const hasRoleInHome = async (
  userId: string,
  homeId: string,
  requiredRole: Role,
): Promise<boolean> => {
  const membership = await prisma.homeMember.findUnique({
    where: {
      homeId_userId: {
        homeId,
        userId,
      },
    },
  });

  if (!membership) return false;

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
};

export const requireHomeRole = (requiredRole: Role) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        throw new ForbiddenError('Authentication required');
      }

      const homeId = req.params.homeId || req.body.homeId || req.query.homeId;

      if (!homeId) {
        throw new ForbiddenError('Home ID required');
      }

      const hasRole = await hasRoleInHome(user.userId, homeId, requiredRole);
      if (!hasRole) {
        throw new ForbiddenError(`Insufficient permissions. Requires ${requiredRole} role.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAdmin = requireHomeRole(Role.ADMIN);
export const requireMember = requireHomeRole(Role.MEMBER);
export const requireGuest = requireHomeRole(Role.GUEST);

export const canAccessDevice = async (
  userId: string,
  deviceId: string,
  requireControl: boolean = false,
): Promise<boolean> => {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      shares: true,
    },
  });

  if (!device) {
    throw new NotFoundError('Device not found');
  }

  if (device.homeId) {
    const isMember = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: {
          homeId: device.homeId,
          userId,
        },
      },
    });
    if (isMember) return true;
  }

  const share = device.shares.find((s: { userId: string; canControl: boolean }) => s.userId === userId);
  if (share) {
    if (requireControl) {
      return share.canControl;
    }
    return true;
  }

  return false;
};
