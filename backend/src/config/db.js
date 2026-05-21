// Prisma client singleton — prevents connection pool exhaustion in PM2 cluster mode.
// Each worker gets one client with its own pool (max ~5 connections per worker).

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log slow queries (> 500ms) — important for identifying analytics bottlenecks
prisma.$on('query', (e) => {
  if (e.duration > 500) {
    logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected');
  }
});

prisma.$on('error', (e) => {
  logger.error({ message: e.message }, 'Prisma error');
});

export { prisma };
