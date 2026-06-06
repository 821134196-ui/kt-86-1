import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { successResponse } from '../utils/response';
import { JwtPayload } from '../types';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const result = await authService.getMe(user.userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1] || '';
      await authService.logout(token);
      successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  },
};
