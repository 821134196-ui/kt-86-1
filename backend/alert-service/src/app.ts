import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import alertRoutes from './routes/alertRoutes';
import notificationRoutes from './routes/notificationRoutes';
import internalRoutes from './routes/internalRoutes';
import healthRoutes from './routes/healthRoutes';

import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

app.get('/api', (req, res) => {
  res.json({
    name: 'Alert Service',
    version: '1.0.0',
    description: '智能家居平台告警通知服务',
  });
});

app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/health', healthRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '路由不存在',
    path: req.path,
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
