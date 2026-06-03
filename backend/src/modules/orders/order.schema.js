import { z } from 'zod';

const CartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().max(500), // 500 = sane bulk buy cap
});

export const CreateOrderSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1, 'Cart is empty').max(50, 'Too many items in cart'),
  fulfillmentType: z.enum(['HOME_DELIVERY', 'STORE_PICKUP']),
  deliverySlotId: z.string().cuid().optional(),
  address: z
    .object({
      line1: z.string().min(5),
      line2: z.string().optional(),
      city: z.string().min(2),
      pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
      landmark: z.string().optional(),
    })
    .optional(),
  // Customer GPS coordinates — used to enforce delivery radius server-side
  deliveryLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  notes: z.string().max(300).optional(),
}).refine(
  (d) => d.fulfillmentType === 'STORE_PICKUP' || d.address,
  { message: 'Delivery address is required for home delivery', path: ['address'] }
);
