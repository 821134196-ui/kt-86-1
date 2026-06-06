import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { logger } from './utils/logger';
import { timescaleDB } from './db/timescaledb';
import { redisClient } from './db/redis';
import { mqttService } from './mqtt/client';
import { webSocketService } from './websocket/server';
import { telemetryService } from './services/telemetry.service';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/api/telemetry', routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully...`);

  telemetryService.stopBatchProcessor();
  webSocketService.close();

  await mqttService.close();
  await redisClient.close();
  await timescaleDB.close();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting telemetry service...', {
      nodeEnv: config.nodeEnv,
      port: config.port,
    });

    await timescaleDB.initialize();
    await mqttService.connect();

    telemetryService.startBatchProcessor();
    webSocketService.attach(server, '/api/telemetry/ws');

    server.listen(config.port, () => {
      logger.info(`Telemetry service listening on port ${config.port}`);
      logger.info(`WebSocket endpoint: ws://localhost:${config.port}/api/telemetry/ws`);
      logger.info(`Health check: http://localhost:${config.port}/api/telemetry/health`);
    });

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
    });
  } catch (err) {
    logger.error('Failed to bootstrap service', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    process.exit(1);
  }
}

bootstrap();
