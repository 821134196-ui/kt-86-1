import { Request, Response, NextFunction } from 'express';
import { homeService, homeMemberService } from '../services/homeService';
import { successResponse } from '../utils/response';
import { JwtPayload } from '../types';
import { Role } from '@prisma/client';

export const homeController = {
  async getUserHomes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const homes = await homeService.getUserHomes(user.userId);
      successResponse(res, homes);
    } catch (error) {
      next(error);
    }
  },

  async getHomeById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const home = await homeService.getHomeById(req.params.id, user.userId);
      successResponse(res, home);
    } catch (error) {
      next(error);
    }
  },

  async createHome(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const home = await homeService.createHome(user.userId, req.body);
      successResponse(res, home, 'Home created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateHome(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const home = await homeService.updateHome(req.params.id, user.userId, req.body);
      successResponse(res, home, 'Home updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteHome(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await homeService.deleteHome(req.params.id, user.userId);
      successResponse(res, null, 'Home deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const members = await homeMemberService.getMembers(req.params.id, user.userId);
      successResponse(res, members);
    } catch (error) {
      next(error);
    }
  },

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const member = await homeMemberService.addMember(
        req.params.id,
        user.userId,
        {
          userId: req.body.userId,
          role: req.body.role as Role,
        },
      );
      successResponse(res, member, 'Member added successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await homeMemberService.removeMember(req.params.id, user.userId, req.params.userId);
      successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  },
};
