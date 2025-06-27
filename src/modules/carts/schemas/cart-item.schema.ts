// src/cart/schemas/cart-item.schema.ts
import { z } from 'zod';

export const CartItemSchema = z.object({
    id: z.number().int().positive().optional(),
    user_id: z.number().int().positive().nullable().optional(),
    session_id: z.string().max(255).nullable().optional(),
    product_variant_id: z.number().int().positive(),
    quantity: z.number().int().min(1),
    added_at: z.date().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type CartItemDto = z.infer<typeof CartItemSchema>;