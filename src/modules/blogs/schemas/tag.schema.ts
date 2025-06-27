// src/blog/schemas/tag.schema.ts
import { z } from 'zod';

export const TagSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().max(100),
    slug: z.string().max(100),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type TagDto = z.infer<typeof TagSchema>;