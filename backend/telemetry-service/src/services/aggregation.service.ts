import { timescaleDB } from '../db/timescaledb';
import { logger } from '../utils/logger';
import { AggregatedTelemetry, AggregationLevel } from '../types';

class AggregationService {
  async getAggregatedData(
    deviceId: string,
    from: Date,
    to: Date,
    capability?: string,
    aggregation: AggregationLevel = '1h'
  ): Promise<AggregatedTelemetry[]> {
    if (aggregation === 'raw') {
      throw new Error('Use queryTelemetry for raw data');
    }

    const rows = await timescaleDB.queryTelemetry(deviceId, from, to, capability, aggregation);

    return rows.map((row) => ({
      deviceId: row.device_id as string,
      capability: row.capability as string,
      timeBucket: new Date(row.time as string),
      avg: row.avg as number,
      min: row.min as number,
      max: row.max as number,
      count: row.count as number,
      first: row.first as number,
      last: row.last as number,
    }));
  }

  async manualAggregate(
    deviceId: string,
    from: Date,
    to: Date,
    bucketInterval: '1 minute' | '1 hour' | '1 day'
  ): Promise<AggregatedTelemetry[]> {
    try {
      const result = await timescaleDB.queryTelemetry(deviceId, from, to, undefined, bucketInterval === '1 minute' ? '1m' : bucketInterval === '1 hour' ? '1h' : '1d');
      return result.map((row) => ({
        deviceId: row.device_id as string,
        capability: row.capability as string,
        timeBucket: new Date(row.time as string),
        avg: row.avg as number,
        min: row.min as number,
        max: row.max as number,
        count: row.count as number,
        first: row.first as number,
        last: row.last as number,
      }));
    } catch (err) {
      logger.error('Manual aggregation failed', { error: (err as Error).message });
      throw err;
    }
  }
}

export const aggregationService = new AggregationService();
