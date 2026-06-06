import { redisClient } from '../db/redis';
import { timescaleDB } from '../db/timescaledb';
import { logger } from '../utils/logger';
import { ThresholdConfig, ThresholdAlert, TelemetryData } from '../types';
import { webSocketService } from '../websocket/server';

class ThresholdService {
  private alertCooldown: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 60000;

  async getThresholds(deviceId: string): Promise<ThresholdConfig[]> {
    return redisClient.getThresholds(deviceId);
  }

  async setThresholds(deviceId: string, thresholds: ThresholdConfig[]): Promise<void> {
    const validated = thresholds.map((t) => ({
      ...t,
      deviceId,
      enabled: t.enabled !== false,
    }));
    await redisClient.setThresholds(deviceId, validated);
    logger.info('Thresholds updated', { deviceId, count: validated.length });
  }

  async checkThresholds(data: TelemetryData): Promise<ThresholdAlert | null> {
    const thresholds = await this.getThresholds(data.deviceId);
    const matching = thresholds.find(
      (t) => t.capability === data.capability && t.enabled
    );

    if (!matching) return null;

    const cooldownKey = `${data.deviceId}:${data.capability}`;
    const lastAlert = this.alertCooldown.get(cooldownKey) || 0;
    if (Date.now() - lastAlert < this.COOLDOWN_MS) {
      return null;
    }

    let alert: ThresholdAlert | null = null;

    if (matching.max !== undefined && data.value > matching.max) {
      alert = {
        deviceId: data.deviceId,
        capability: data.capability,
        value: data.value,
        thresholdType: 'max',
        thresholdValue: matching.max,
        timestamp: data.timestamp,
        acknowledged: false,
      };
    } else if (matching.min !== undefined && data.value < matching.min) {
      alert = {
        deviceId: data.deviceId,
        capability: data.capability,
        value: data.value,
        thresholdType: 'min',
        thresholdValue: matching.min,
        timestamp: data.timestamp,
        acknowledged: false,
      };
    }

    if (alert) {
      this.alertCooldown.set(cooldownKey, Date.now());
      await timescaleDB.insertAlert(alert);
      webSocketService.broadcastAlert(alert);
      logger.warn('Threshold exceeded', {
        deviceId: alert.deviceId,
        capability: alert.capability,
        value: alert.value,
        thresholdType: alert.thresholdType,
        thresholdValue: alert.thresholdValue,
      });
    }

    return alert;
  }
}

export const thresholdService = new ThresholdService();
