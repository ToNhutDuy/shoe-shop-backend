import { z } from 'zod';

export const FlashSaleSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().max(255),
    starts_at: z.date(),
    ends_at: z.date(),
    is_active: z.boolean().default(true),
    banner_media_id: z.number().int().positive().nullable().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type FlashSaleDto = z.infer<typeof FlashSaleSchema>;