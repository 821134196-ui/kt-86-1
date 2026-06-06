import { Request, Response, NextFunction } from 'express';
import { telemetryService } from '../services/telemetry.service';
import { thresholdService } from '../services/threshold.service';
import { aggregationService } from '../services/aggregation.service';
import { timescaleDB } from '../db/timescaledb';
import { redisClient } from '../db/redis';
import { mqttService } from '../mqtt/client';
import { webSocketService } from '../websocket/server';
import { AggregationLevel, ThresholdConfig, HealthCheckResponse } from '../types';
import { logger } from '../utils/logger';

export const getDeviceTelemetry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { from, to, capability, aggregation = 'raw' } = req.query;

    if (!from || !to) {
      res.status(400).json({ error: 'from and to query parameters are required' });
      return;
    }

    const aggLevels: AggregationLevel[] = ['raw', '1m', '1h', '1d'];
    if (!aggLevels.includes(aggregation as AggregationLevel)) {
      res.status(400).json({ error: 'Invalid aggregation level. Must be one of: raw, 1m, 1h, 1d' });
      return;
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    const data = await telemetryService.queryTelemetry(
      deviceId,
      fromDate,
      toDate,
      capability as string | undefined,
      aggregation as AggregationLevel
    );

    res.json({
      deviceId,
      from: fromDate,
      to: toDate,
      aggregation: aggregation as AggregationLevel,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getDeviceLatest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const state = await telemetryService.getLatestState(deviceId);

    if (!state) {
      res.status(404).json({ error: 'Device not found or no telemetry data available' });
      return;
    }

    res.json(state);
  } catch (err) {
    next(err);
  }
};

export const getDeviceThresholds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const thresholds = await thresholdService.getThresholds(deviceId);
    res.json({ deviceId, thresholds });
  } catch (err) {
    next(err);
  }
};

export const setDeviceThresholds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { thresholds } = req.body as { thresholds: ThresholdConfig[] };

    if (!Array.isArray(thresholds)) {
      res.status(400).json({ error: 'thresholds must be an array' });
      return;
    }

    for (const t of thresholds) {
      if (!t.capability) {
        res.status(400).json({ error: 'Each threshold must have a capability' });
        return;
      }
      if (t.min === undefined && t.max === undefined) {
        res.status(400).json({ error: 'Each threshold must have at least min or max' });
        return;
      }
    }

    await thresholdService.setThresholds(deviceId, thresholds);
    res.json({ deviceId, thresholds, message: 'Thresholds updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const getHealth = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [timescaledbHealth, redisHealth] = await Promise.all([
      timescaleDB.healthCheck(),
      redisClient.healthCheck(),
    ]);
    const mqttHealth = mqttService.healthCheck();

    const allHealthy = timescaledbHealth && redisHealth && mqttHealth;

    const response: HealthCheckResponse = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        timescaledb: timescaledbHealth ? 'healthy' : 'unhealthy',
        redis: redisHealth ? 'healthy' : 'unhealthy',
        mqtt: mqttHealth ? 'healthy' : 'unhealthy',
      },
    };

    res.status(allHealthy ? 200 : 503).json(response);
  } catch (err) {
    next(err);
  }
};

export const getAggregated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { from, to, capability, aggregation = '1h' } = req.query;

    if (!from || !to) {
      res.status(400).json({ error: 'from and to query parameters are required' });
      return;
    }

    const aggLevels: AggregationLevel[] = ['1m', '1h', '1d'];
    if (!aggLevels.includes(aggregation as AggregationLevel)) {
      res.status(400).json({ error: 'Invalid aggregation level. Must be one of: 1m, 1h, 1d' });
      return;
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    const data = await aggregationService.getAggregatedData(
      deviceId,
      fromDate,
      toDate,
      capability as string | undefined,
      aggregation as AggregationLevel
    );

    res.json({
      deviceId,
      from: fromDate,
      to: toDate,
      aggregation: aggregation as AggregationLevel,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getWsInfo = (_req: Request, res: Response): void => {
  res.json({
    endpoint: '/api/telemetry/ws',
    description: 'WebSocket endpoint for real-time telemetry and alerts',
    connectedClients: webSocketService.getClientCount(),
    messageTypes: ['telemetry', 'alert', 'subscribe', 'unsubscribe'],
  });
};

export const logMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  logger.debug(`${req.method} ${req.path}`);
  next();
};
