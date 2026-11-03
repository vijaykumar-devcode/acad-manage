import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface MongooseError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

interface ZodError extends Error {
  issues?: Array<{ message: string; path: (string | number)[] }>;
}

export const errorHandler = (
  err: MongooseError & ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000 && err.keyValue) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered: ${field}. Please use another value.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle Zod Validation Error — use .issues (Zod v4 API)
  if (err.name === 'ZodError' && err.issues) {
    statusCode = 400;
    message = err.issues.map((e) => e.message).join(', ');
  }

  // Log server errors (5xx) at error level; client errors (4xx) at warn level
  if (statusCode >= 500) {
    logger.error({ err, method: req.method, url: req.url, statusCode }, 'Internal server error');
  } else {
    logger.warn({ message, method: req.method, url: req.url, statusCode }, 'Client error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Never expose stack traces in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
