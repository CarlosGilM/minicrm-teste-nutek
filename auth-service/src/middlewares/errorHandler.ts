import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Custom application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Prisma unique constraint violation
  if (err && err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const target = (err.meta?.['target'] as string[]) || [];
      res.status(409).json({
        error: `${target.join(', ')} already exists`,
      });
      return;
    }
  }

  // Unhandled errors
  console.error('❌ Unhandled error:', err);

  res.status(500).json({
    error: env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
