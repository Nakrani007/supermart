// Centralized error handler — the single place where all errors become HTTP responses.
// Business logic throws plain Error objects with .statusCode attached.

import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  // Zod validation errors have a specific shape
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma unique constraint violation (e.g., duplicate mobile)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    logger.error({ err, url: req.url, method: req.method }, 'Server error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Expose extra fields like `available` for out-of-stock errors
    ...(err.available !== undefined && { available: err.available }),
    ...(err.productId !== undefined && { productId: err.productId }),
  });
}
