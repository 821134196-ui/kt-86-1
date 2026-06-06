import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import ruleRoutes from './routes/ruleRoutes';
import sceneRoutes from './routes/sceneRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './utils/errorHandler';
import { config } from './config';
import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

app.get('/', (_req, res) => {
  res.json({
    service: 'rule-engine',
    version: '1.0.0',
    status: 'running',
    docs: {
      rules: '/api/rules',
      scenes: '/api/scenes',
      health: '/api/health',
    },
  });
});

app.use('/api/rules', ruleRoutes);
app.use('/api/scenes', sceneRoutes);
app.use('/api/health', healthRoutes);

app.use(errorHandler);

app.use('*', (_req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
    },
  });
});

export default app;
