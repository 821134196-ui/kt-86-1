import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://smarthome:smarthome123@localhost:5432/smarthome',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  deviceServiceUrl: process.env.DEVICE_SERVICE_URL || 'http://localhost:3001',
  telemetryServiceUrl: process.env.TELEMETRY_SERVICE_URL || 'http://localhost:3003',
  logLevel: process.env.LOG_LEVEL || 'info',
  heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT || '30000', 10),
  idempotencyTtl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10),
};
