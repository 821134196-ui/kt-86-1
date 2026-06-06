import { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { db } from '../infrastructure/database';
import { redisClient } from '../infrastructure/redis';
import { config } from '../config';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {};

  try {
    await db.query('SELECT 1');
    checks.postgres = { status: 'healthy' };
  } catch (error: any) {
    checks.postgres = { status: 'unhealthy', error: error.message };
  }

  try {
    await redisClient.getClient().ping();
    checks.redis = { status: 'healthy' };
  } catch (error: any) {
    checks.redis = { status: 'unhealthy', error: error.message };
  }

  const allHealthy = Object.values(checks).every((c: any) => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    service: 'rule-engine',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    checks,
  });
});
