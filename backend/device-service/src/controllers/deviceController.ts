import { Request, Response, NextFunction } from 'express';
import { deviceTypeService, deviceService } from '../services/deviceService';
import { successResponse } from '../utils/response';
import { JwtPayload } from '../types';
import { DeviceStatus } from '@prisma/client';

export const deviceTypeController = {
  async getAllDeviceTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await deviceTypeService.getAllDeviceTypes();
      successResponse(res, types);
    } catch (error) {
      next(error);
    }
  },

  async getDeviceTypeById(req: Request, res: Response, next: NextFunction) {
    try {
      const type = await deviceTypeService.getDeviceTypeById(req.params.id);
      successResponse(res, type);
    } catch (error) {
      next(error);
    }
  },

  async createDeviceType(req: Request, res: Response, next: NextFunction) {
    try {
      const type = await deviceTypeService.createDeviceType(req.body);
      successResponse(res, type, 'Device type created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateDeviceType(req: Request, res: Response, next: NextFunction) {
    try {
      const type = await deviceTypeService.updateDeviceType(req.params.id, req.body);
      successResponse(res, type, 'Device type updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteDeviceType(req: Request, res: Response, next: NextFunction) {
    try {
      await deviceTypeService.deleteDeviceType(req.params.id);
      successResponse(res, null, 'Device type deleted successfully');
    } catch (error) {
      next(error);
    }
  },
};

export const deviceController = {
  async getDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const filters: any = {};

      if (req.query.homeId) filters.homeId = req.query.homeId as string;
      if (req.query.roomId) filters.roomId = req.query.roomId as string;
      if (req.query.deviceGroupId) filters.deviceGroupId = req.query.deviceGroupId as string;
      if (req.query.status) filters.status = req.query.status as DeviceStatus;

      const devices = await deviceService.getDevices(user.userId, filters);
      successResponse(res, devices);
    } catch (error) {
      next(error);
    }
  },

  async getDeviceById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const device = await deviceService.getDeviceById(req.params.id, user.userId);
      successResponse(res, device);
    } catch (error) {
      next(error);
    }
  },

  async createDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const device = await deviceService.createDevice(user.userId, req.body);
      successResponse(res, device, 'Device created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const device = await deviceService.updateDevice(req.params.id, user.userId, req.body);
      successResponse(res, device, 'Device updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      await deviceService.deleteDevice(req.params.id, user.userId);
      successResponse(res, null, 'Device deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  async sendCommand(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as JwtPayload;
      const result = await deviceService.sendCommand(
        req.params.id,
        user.userId,
        req.body,
      );
      successResponse(res, result, 'Command sent successfully');
    } catch (error) {
      next(error);
    }
  },
};
