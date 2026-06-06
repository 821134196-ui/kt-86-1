import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger from './utils/logger';
import mqttService from './services/mqtt';
import commandRoutes from './routes/commandRoutes';
import healthRoutes from './routes/healthRoutes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import './services/deviceStatus';
import './services/commandService';
import './services/telemetryForwarder';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.use('/api/gateway', commandRoutes);
app.use('/api/gateway', healthRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'gateway-service',
    version: '1.0.0',
    status: 'running',
    environment: config.nodeEnv,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    logger.info('Starting Gateway Service...');

    await mqttService.connect();
    logger.info('MQTT service initialized');

    app.listen(config.port, () => {
      logger.info(`Gateway Service is running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/api/gateway/health`);
    });

    const shutdownSignals = ['SIGINT', 'SIGTERM'] as const;
    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`${signal} received, shutting down gracefully...`);
        await shutdown();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown().then(() => process.exit(1));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down services...');
  try {
    await mqttService.close();
    logger.info('MQTT service closed');
  } catch (err) {
    logger.error('Error closing MQTT service:', err);
  }
  logger.info('Shutdown complete');
}

startServer();

export default app;
