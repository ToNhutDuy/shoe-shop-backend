// src/banner/schemas/banner.schema.ts
import { z } from 'zod';

export const BannerSchema = z.object({
    id: z.number().int().positive().optional(),
    title: z.string().max(255).nullable().optional(),
    media_id: z.number().int().positive(),
    link_url: z.string().url().max(255).nullable().optional(),
    position_key: z.string().max(100).nullable().optional(),
    banner_type: z.string().max(100).nullable().optional(),
    display_order: z.number().int().min(0).default(0),
    starts_at: z.date().nullable().optional(),
    ends_at: z.date().nullable().optional(),
    is_active: z.boolean().default(true),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type BannerDto = z.infer<typeof BannerSchema>;