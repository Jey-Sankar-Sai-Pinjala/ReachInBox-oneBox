import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFound } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Global error handler:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  errorHandler(error, req, res, next);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  notFound(req, res, next);
};

export default {
  globalErrorHandler,
  notFoundHandler
};

