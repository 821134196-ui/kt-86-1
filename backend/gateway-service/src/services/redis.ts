import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redisUrl, {
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async setnx(key: string, value: string, ttl?: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'NX', ttl ? 'EX' : undefined as any, ttl as any);
    return result === 'OK';
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  async close() {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();
export default redisClient;
