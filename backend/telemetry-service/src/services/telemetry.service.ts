import { config, AggregationLevel } from '../config';
import { timescaleDB } from '../db/timescaledb';
import { redisClient } from '../db/redis';
import { logger } from '../utils/logger';
import { TelemetryData, DeviceLatestState } from '../types';
import { thresholdService } from './threshold.service';

class TelemetryService {
  private batch: TelemetryData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  startBatchProcessor(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, config.batchFlushInterval);

    logger.info('Batch processor started', {
      batchSize: config.batchSize,
      flushInterval: config.batchFlushInterval,
    });
  }

  stopBatchProcessor(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBatch();
  }

  async processTelemetry(data: TelemetryData): Promise<void> {
    try {
      await redisClient.updateLatestCapability(
        data.deviceId,
        data.capability,
        data.value,
        data.timestamp
      );

      this.batch.push(data);

      if (this.batch.length >= config.batchSize) {
        await this.flushBatch();
      }

      await thresholdService.checkThresholds(data);
    } catch (err) {
      logger.error('Failed to process telemetry', {
        error: (err as Error).message,
        deviceId: data.deviceId,
      });
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const toFlush = [...this.batch];
    this.batch = [];

    try {
      await timescaleDB.batchInsertTelemetry(toFlush);
      logger.debug('Batch flushed', { count: toFlush.length });
    } catch (err) {
      logger.error('Failed to flush batch', {
        error: (err as Error).message,
        count: toFlush.length,
      });
      this.batch = [...toFlush, ...this.batch];
    }
  }

  async queryTelemetry(
    deviceId: string,
    from: Date,
    to: Date,
    capability?: string,
    aggregation: AggregationLevel = 'raw'
  ): Promise<Array<Record<string, unknown>>> {
    return timescaleDB.queryTelemetry(deviceId, from, to, capability, aggregation);
  }

  async getLatestState(deviceId: string): Promise<DeviceLatestState | null> {
    return redisClient.getLatestState(deviceId);
  }
}

export const telemetryService = new TelemetryService();
