import { z } from 'zod';
import * as posService from './pos.service.js';

const SyncItemSchema = z.object({
  barcode: z.string().min(4).max(20),
  sku: z.string().optional(),
  name: z.string().min(1).max(200),
  nameHi: z.string().optional(),
  nameGu: z.string().optional(),
  mrp: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  stockQty: z.number().int().min(0),
  unit: z.enum(['piece', 'kg', 'litre', 'pack', 'dozen', 'gram']).optional(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const SyncPayloadSchema = z.object({
  items: z.array(SyncItemSchema).min(1).max(500),
});

const AdjustSchema = z.object({
  barcode: z.string(),
  delta: z.number().int(), // positive = restock, negative = correction
});

export async function syncProducts(req, res, next) {
  try {
    const { items } = SyncPayloadSchema.parse(req.body);
    const result = await posService.syncProductsService(items);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { barcode, delta } = AdjustSchema.parse(req.body);
    const product = await posService.adjustStockService(barcode, delta);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}
