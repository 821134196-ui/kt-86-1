import { Request, Response } from 'express';
import db from '../services/database';
import redisClient from '../services/redis';
import mqttService from '../services/mqtt';
import deviceStatusManager from '../services/deviceStatus';
import { ApiResponse } from '../types';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const dbHealth = await db.healthCheck();
  const redisHealth = await redisClient.healthCheck();
  const mqttHealth = mqttService.healthCheck();

  const overallHealthy = dbHealth && redisHealth && mqttHealth;

  const healthData = {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth ? 'healthy' : 'unhealthy',
      redis: redisHealth ? 'healthy' : 'unhealthy',
      mqtt: mqttHealth ? 'healthy' : 'unhealthy',
    },
    devices: {
      total: deviceStatusManager.getAllDeviceStatuses().length,
      online: deviceStatusManager.getAllDeviceStatuses().filter(d => d.isOnline).length,
    },
  };

  const statusCode = overallHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: overallHealthy,
    data: healthData,
  } as ApiResponse);
}
