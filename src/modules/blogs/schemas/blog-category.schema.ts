// src/blog/schemas/blog-category.schema.ts
import { z } from 'zod';

export const BlogCategorySchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().max(255),
    slug: z.string().max(255),
    description: z.string().nullable().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type BlogCategoryDto = z.infer<typeof BlogCategorySchema>;