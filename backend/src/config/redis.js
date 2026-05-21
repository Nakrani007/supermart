// Redis is optional in dev — all cache calls are wrapped in .catch(() => {})
// so the server runs fine without it. In production, set REDIS_URL properly.

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redis;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't retry in dev — fail fast and carry on
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', () => {}); // suppress ioredis error logs in dev
} catch {
  logger.warn('Redis not available — running without cache');
}

// Stub that silently no-ops when Redis is down
const noopRedis = {
  get: async () => null,
  setex: async () => {},
  del: async () => {},
  keys: async () => [],
  connect: async () => {},
  quit: async () => {},
};

export { redis, noopRedis };

// Safe wrappers — always use these instead of redis.* directly
export const cache = {
  get: (key) => (redis ? redis.get(key).catch(() => null) : Promise.resolve(null)),
  setex: (key, ttl, val) => (redis ? redis.setex(key, ttl, val).catch(() => {}) : Promise.resolve()),
  del: (...keys) => (redis ? redis.del(...keys).catch(() => {}) : Promise.resolve()),
  keys: (pattern) => (redis ? redis.keys(pattern).catch(() => []) : Promise.resolve([])),
};

export const CACHE_TTL = {
  PRODUCTS: 300,
  OTP: 600,
  DASHBOARD: 120,
  DELIVERY_SLOTS: 60,
};
