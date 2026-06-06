import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { getRedisClient } from './config/redis';

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    getRedisClient();
    logger.info('Redis client initialized');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await prisma.$disconnect();
          logger.info('Database disconnected');
        } catch (error) {
          logger.error('Error during database disconnection:', error);
        }

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught Exception: ${error.message}`, error.stack);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
