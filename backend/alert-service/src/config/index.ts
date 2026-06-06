import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  logLevel: string;
  internalApiSecret: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://smarthome:smarthome123@postgres:5432/smarthome',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  logLevel: process.env.LOG_LEVEL || 'info',
  internalApiSecret: process.env.INTERNAL_API_SECRET || 'internal-secret-key-change-me',
};
