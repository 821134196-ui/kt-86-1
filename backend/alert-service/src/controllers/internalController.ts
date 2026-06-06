import { Request, Response, NextFunction } from 'express';
import { alertService } from '../services/alertService';
import { CreateAlertRequest } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

export const internalApiAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-api-secret'];
  if (secret !== config.internalApiSecret) {
    return res.status(401).json({
      success: false,
      error: '无效的内部 API 密钥',
    });
  }
  next();
};

export const createAlert = async (req: Request, res: Response) => {
  try {
    const request: CreateAlertRequest = req.body;

    if (!request.homeId || !request.alertType || !request.severity || !request.title) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: homeId, alertType, severity, title',
      });
    }

    const alert = await alertService.createAlert(request);

    res.status(201).json({
      success: true,
      data: alert,
      message: '告警创建成功',
    });
  } catch (err) {
    logger.error('Error creating alert (internal):', err);
    res.status(500).json({
      success: false,
      error: '创建告警失败',
      message: (err as Error).message,
    });
  }
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const { query } = require('../config/database');
    const getRedisClient = require('../config/redis').getRedisClient;

    let dbHealthy = false;
    let redisHealthy = false;

    try {
      await query('SELECT 1');
      dbHealthy = true;
    } catch (err) {
      logger.error('Database health check failed:', err);
    }

    try {
      const redis = getRedisClient();
      await redis.ping();
      redisHealthy = true;
    } catch (err) {
      logger.error('Redis health check failed:', err);
    }

    const healthy = dbHealthy && redisHealthy;

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          redis: redisHealthy ? 'healthy' : 'unhealthy',
        },
      },
    });
  } catch (err) {
    logger.error('Health check error:', err);
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    });
  }
};
