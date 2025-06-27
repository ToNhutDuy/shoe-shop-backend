// src/cms/schemas/cms-page.schema.ts
import { z } from 'zod';

export const CmsPageSchema = z.object({
    id: z.number().int().positive().optional(),
    title: z.string().max(255),
    slug: z.string().max(255),
    content_html: z.string(),
    status: z.enum(['published', 'draft', 'archived' as const]).default('published'),
    meta_title: z.string().max(255).nullable().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type CmsPageDto = z.infer<typeof CmsPageSchema>;