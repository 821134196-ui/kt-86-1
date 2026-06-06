import { Request, Response, NextFunction } from 'express';
import { deviceShareService } from '../services/shareService';
import { successResponse } from '../utils/response';
import { JwtPayload } from '../types';

export const deviceShareController = {
  async getDeviceShares(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const shares = await deviceShareService.getDeviceShares(req.params.id, user.userId);
      successResponse(res, shares);
    } catch (error) {
      next(error);
    }
  },

  async createDeviceShare(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const share = await deviceShareService.createDeviceShare(
        req.params.id,
        user.userId,
        {
          userId: req.body.userId,
          canControl: req.body.canControl,
          expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        },
      );
      successResponse(res, share, 'Device shared successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async deleteDeviceShare(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await deviceShareService.deleteDeviceShare(
        req.params.id,
        user.userId,
        req.params.userId,
      );
      successResponse(res, null, 'Device share revoked successfully');
    } catch (error) {
      next(error);
    }
  },
};
