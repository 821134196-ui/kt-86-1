import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getRedisClient } from '../config/redis';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'device-service',
    version: process.env.npm_package_version || '1.0.0',
  };

  let overallStatus = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'connected' };
  } catch (error: any) {
    checks.database = { status: 'disconnected', error: error.message };
    overallStatus = 503;
    logger.error(`Health check - Database error: ${error.message}`);
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = { status: 'connected' };
  } catch (error: any) {
    checks.redis = { status: 'disconnected', error: error.message };
    overallStatus = 503;
    logger.error(`Health check - Redis error: ${error.message}`);
  }

  if (overallStatus === 503) {
    checks.status = 'degraded';
  }

  res.status(overallStatus).json(checks);
});

router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = getRedisClient();
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

export default router;
