import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { mqttClient } from './infrastructure/mqtt';
import { ruleEngine } from './engine/ruleEngine';
import { db } from './infrastructure/database';
import { timescaleDb } from './infrastructure/timescaledb';
import { redisClient } from './infrastructure/redis';

async function startServer() {
  try {
    logger.info('Starting Rule Engine Service...');
    logger.info(`Environment: ${config.nodeEnv}`);

    await mqttClient.connect();
    logger.info('MQTT client initialized');

    await ruleEngine.start();
    logger.info('Rule engine started');

    const server = app.listen(config.port, () => {
      logger.info(`Rule Engine Service running on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          await ruleEngine.shutdown();
          await mqttClient.close();
          await redisClient.close();
          await db.close();
          await timescaleDb.close();
          logger.info('Rule Engine Service shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
      });
    });
  } catch (error) {
    logger.error('Failed to start Rule Engine Service', { error });
    process.exit(1);
  }
}

startServer();
