// src/promotion/schemas/order-promotion.schema.ts
import { z } from 'zod';

export const OrderPromotionSchema = z.object({
    order_id: z.number().int().positive(),
    promotion_id: z.number().int().positive(),
    amount_discounted: z.number().refine((val) => !isNaN(val)),
    applied_at: z.date().optional(),
    created_at: z.date().optional(),
});

export type OrderPromotionDto = z.infer<typeof OrderPromotionSchema>;
