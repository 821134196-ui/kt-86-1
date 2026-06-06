import { Request, Response, NextFunction } from 'express';
import { roomService, deviceGroupService } from '../services/roomService';
import { successResponse } from '../utils/response';
import { JwtPayload } from '../types';

export const roomController = {
  async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const homeId = req.query.homeId as string;
      if (!homeId) {
        return successResponse(res, []);
      }
      const rooms = await roomService.getRoomsByHome(homeId, user.userId);
      successResponse(res, rooms);
    } catch (error) {
      next(error);
    }
  },

  async getRoomById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const room = await roomService.getRoomById(req.params.id, user.userId);
      successResponse(res, room);
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const room = await roomService.createRoom(user.userId, req.body);
      successResponse(res, room, 'Room created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const room = await roomService.updateRoom(req.params.id, user.userId, req.body);
      successResponse(res, room, 'Room updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await roomService.deleteRoom(req.params.id, user.userId);
      successResponse(res, null, 'Room deleted successfully');
    } catch (error) {
      next(error);
    }
  },
};

export const deviceGroupController = {
  async getDeviceGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const homeId = req.query.homeId as string;
      if (!homeId) {
        return successResponse(res, []);
      }
      const groups = await deviceGroupService.getDeviceGroupsByHome(homeId, user.userId);
      successResponse(res, groups);
    } catch (error) {
      next(error);
    }
  },

  async getDeviceGroupById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const group = await deviceGroupService.getDeviceGroupById(req.params.id, user.userId);
      successResponse(res, group);
    } catch (error) {
      next(error);
    }
  },

  async createDeviceGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const group = await deviceGroupService.createDeviceGroup(user.userId, req.body);
      successResponse(res, group, 'Device group created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateDeviceGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const group = await deviceGroupService.updateDeviceGroup(req.params.id, user.userId, req.body);
      successResponse(res, group, 'Device group updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteDeviceGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await deviceGroupService.deleteDeviceGroup(req.params.id, user.userId);
      successResponse(res, null, 'Device group deleted successfully');
    } catch (error) {
      next(error);
    }
  },
};
