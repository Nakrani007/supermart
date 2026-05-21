// Structured JSON logging via Winston.
// In production: logs go to file + stdout for PM2/journald capture.
// In development: colorized console output for readability.

import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

const transports = [];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    new winston.transports.Console({ format: combine(timestamp(), json()) })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports,
  // Don't crash the process on unhandled promise rejections in logger itself
  exitOnError: false,
});
