import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { wsService } from './services/websocketService';
import { getPool } from './config/database';
import { getRedisClient } from './config/redis';

const server = createServer(app);

wsService.init(server);

const startServer = async () => {
  try {
    logger.info('Initializing database connection...');
    await getPool().query('SELECT 1');
    logger.info('Database connected successfully');

    logger.info('Initializing Redis connection...');
    const redis = getRedisClient();
    await redis.ping();
    logger.info('Redis connected successfully');

    server.listen(config.port, () => {
      logger.info(`Alert service is running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

const shutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      wsService.close();
      logger.info('WebSocket server closed');

      const { closePool } = await import('./config/database');
      await closePool();
      logger.info('Database connection closed');

      const { closeRedis } = await import('./config/redis');
      await closeRedis();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
