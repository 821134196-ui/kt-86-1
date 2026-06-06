import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  timescaledbUrl: process.env.TIMESCALEDB_URL || 'postgresql://telemetry:telemetry123@timescaledb:5432/telemetry',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883',
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  batchFlushInterval: parseInt(process.env.BATCH_FLUSH_INTERVAL || '1000', 10),
  redisLatestPrefix: 'device:latest:',
  redisThresholdPrefix: 'device:threshold:',
  aggregationRetention: {
    '1m': '7 days',
    '1h': '30 days',
    '1d': '365 days',
  },
};

export type AggregationLevel = 'raw' | '1m' | '1h' | '1d';
