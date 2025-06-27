// src/cart/schemas/wishlist-item.schema.ts
import { z } from 'zod';

export const WishlistItemSchema = z.object({
    id: z.number().int().positive().optional(),
    user_id: z.number().int().positive(),
    product_variant_id: z.number().int().positive(),
    added_at: z.date().optional(),
    created_at: z.date().optional(),
});

export type WishlistItemDto = z.infer<typeof WishlistItemSchema>;