import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  databaseUrl: process.env.DATABASE_URL || 'postgresql://smarthome:smarthome123@localhost:5432/smarthome',
  timescaledbUrl: process.env.TIMESCALEDB_URL || 'postgresql://telemetry:telemetry123@localhost:5433/telemetry',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',

  deviceServiceUrl: process.env.DEVICE_SERVICE_URL || 'http://localhost:3001',
  telemetryServiceUrl: process.env.TELEMETRY_SERVICE_URL || 'http://localhost:3003',
  gatewayServiceUrl: process.env.GATEWAY_SERVICE_URL || 'http://localhost:3002',
  alertServiceUrl: process.env.ALERT_SERVICE_URL || 'http://localhost:3005',

  mqttTopics: {
    telemetryPrefix: 'telemetry/+/+',
    deviceState: 'devices/+/state',
  },
};
