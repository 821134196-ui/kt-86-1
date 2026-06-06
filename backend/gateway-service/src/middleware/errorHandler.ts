import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiResponse } from '../types';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  } as ApiResponse);
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 ? 'Internal Server Error' : message,
    message: process.env.NODE_ENV === 'development' ? message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  } as ApiResponse);
}
