// server.js — Express application entry point.
// PM2 cluster mode (ecosystem.config.js) handles multi-core scaling.
// This file represents a single worker process.

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { authRouter } from './modules/auth/auth.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { posRouter } from './modules/pos/pos.routes.js';
import { ensureDefaultAdmin } from './modules/admin/admin.service.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js'; // may be undefined if Redis not installed

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Trust Nginx proxy — needed for req.ip and rate limiter to see real client IP
app.set('trust proxy', 1);

// ─── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    // PWA fetches assets cross-origin from CDN
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, Postman, POS terminals)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-pos-api-key'],
  })
);

// ─── Body Parsing + Compression ───────────────────────────────────────────────
// Compression is critical — Tier-2 users often on 2G/3G, every KB matters
app.use(compression({ threshold: 512 }));
app.use(express.json({ limit: '2mb' })); // 2mb cap prevents JSON bomb attacks
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Static Uploads ───────────────────────────────────────────────────────────
// Serve uploaded product images at /uploads/*
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', globalRateLimiter);

// ─── API Info (root) ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'SuperMart API',
    version: 'v1',
    status: 'running',
    docs: 'http://localhost:5555 (Prisma Studio)',
    frontend: 'http://localhost:5173',
    endpoints: {
      health:     'GET  /health',
      products:   'GET  /api/v1/products',
      categories: 'GET  /api/v1/products/categories',
      auth_otp:   'POST /api/v1/auth/otp/send',
      auth_verify:'POST /api/v1/auth/otp/verify',
      auth_me:    'GET  /api/v1/auth/me  (Bearer token)',
      orders:     'POST /api/v1/orders/create  (Bearer token)',
      my_orders:  'GET  /api/v1/orders/my  (Bearer token)',
      slots:      'GET  /api/v1/orders/slots?date=YYYY-MM-DD',
      dashboard:  'GET  /api/v1/dashboard/metrics  (Bearer token)',
      pos_sync:   'POST /api/v1/pos/sync  (x-pos-api-key header)',
    },
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', ts: Date.now(), uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'degraded', ts: Date.now() });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',      authRouter);
app.use('/api/v1/orders',    orderRouter);
app.use('/api/v1/products',  productRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/admin',     adminRouter);
app.use('/api/v1/pos',       posRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
// Must be last — Express identifies error handlers by 4-argument signature
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const httpServer = createServer(app);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    // Auto-create default admin if none exists (runs once on first boot)
    await ensureDefaultAdmin();

    // Redis is optional — skip if not available
    if (redis) {
      await redis.connect().catch(() => logger.warn('Redis unavailable — cache disabled'));
    }

    httpServer.listen(PORT, () => {
      logger.info(
        { port: PORT, env: process.env.NODE_ENV, pid: process.pid },
        'Server started'
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// PM2 sends SIGTERM before reloading — allow in-flight requests to finish
process.on('SIGTERM', async () => {
  logger.info('SIGTERM: graceful shutdown initiated');
  httpServer.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis?.quit()]);
    logger.info('SIGTERM: shutdown complete');
    process.exit(0);
  });

  // Force exit after 15s if connections don't drain
  setTimeout(() => {
    logger.error('SIGTERM: forced shutdown after timeout');
    process.exit(1);
  }, 15000);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

bootstrap();
