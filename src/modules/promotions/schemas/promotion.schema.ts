// src/promotion/schemas/promotion.schema.ts
import { z } from 'zod';

export const PromotionSchema = z.object({
    id: z.number().int().positive().optional(),
    code: z.string().max(50),
    description: z.string().nullable().optional(),
    discount_type: z.enum(['percentage', 'fixed_amount_order', 'free_shipping' as const]),
    discount_value: z.number().refine((val) => !isNaN(val)),
    minimum_order_value: z.number().refine((val) => !isNaN(val)).nullable().optional(),
    maximum_usage_limit: z.number().int().positive().nullable().optional(),
    current_usage_count: z.number().int().min(0).default(0),
    usage_limit_per_user: z.number().int().positive().nullable().optional(),
    starts_at: z.date(),
    ends_at: z.date(),
    is_active: z.boolean().default(true),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type PromotionDto = z.infer<typeof PromotionSchema>;