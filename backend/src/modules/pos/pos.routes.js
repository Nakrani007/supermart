import { Router } from 'express';
import { requirePosKey } from '../../middleware/auth.js';
import * as ctrl from './pos.controller.js';

export const posRouter = Router();

// All POS routes use API key auth (not JWT — POS terminals don't do user sessions)
posRouter.use(requirePosKey);

// POST /api/v1/pos/sync  — bulk product upsert from POS
posRouter.post('/sync', ctrl.syncProducts);

// POST /api/v1/pos/adjust — manual stock correction
posRouter.post('/adjust', ctrl.adjustStock);
