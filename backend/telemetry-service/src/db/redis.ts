import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DeviceLatestState, ThresholdConfig } from '../types';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  async getLatestState(deviceId: string): Promise<DeviceLatestState | null> {
    const key = `${config.redisLatestPrefix}${deviceId}`;
    const data = await this.client.get(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      ...parsed,
      updatedAt: new Date(parsed.updatedAt),
      capabilities: Object.fromEntries(
        Object.entries(parsed.capabilities).map(([k, v]: [string, any]) => [
          k,
          { ...v, timestamp: new Date(v.timestamp) },
        ])
      ),
    };
  }

  async setLatestState(deviceId: string, state: DeviceLatestState): Promise<void> {
    const key = `${config.redisLatestPrefix}${deviceId}`;
    await this.client.set(key, JSON.stringify(state), 'EX', 86400 * 7);
  }

  async updateLatestCapability(
    deviceId: string,
    capability: string,
    value: number,
    timestamp: Date
  ): Promise<DeviceLatestState> {
    let state = await this.getLatestState(deviceId);

    if (!state) {
      state = {
        deviceId,
        capabilities: {},
        updatedAt: timestamp,
      };
    }

    state.capabilities[capability] = { value, timestamp };
    state.updatedAt = timestamp;

    await this.setLatestState(deviceId, state);
    return state;
  }

  async getThresholds(deviceId: string): Promise<ThresholdConfig[]> {
    const key = `${config.redisThresholdPrefix}${deviceId}`;
    const data = await this.client.get(key);
    if (!data) return [];
    return JSON.parse(data);
  }

  async setThresholds(deviceId: string, thresholds: ThresholdConfig[]): Promise<void> {
    const key = `${config.redisThresholdPrefix}${deviceId}`;
    await this.client.set(key, JSON.stringify(thresholds));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();
