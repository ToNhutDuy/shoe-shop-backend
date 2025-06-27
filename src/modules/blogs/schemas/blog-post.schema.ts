// src/blog/schemas/blog-post.schema.ts
import { z } from 'zod';

export const BlogPostSchema = z.object({
    id: z.number().int().positive().optional(),
    title: z.string().max(255),
    slug: z.string().max(255),
    content_html: z.string(),
    excerpt: z.string().nullable().optional(),
    blog_category_id: z.number().int().positive(),
    author_user_id: z.number().int().positive().nullable().optional(),
    featured_image_media_id: z.number().int().positive().nullable().optional(),
    status: z.enum(['draft', 'published', 'archived', 'pending_review' as const]).default('draft'),
    published_at: z.date().nullable().optional(),
    view_count: z.number().int().min(0).default(0),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type BlogPostDto = z.infer<typeof BlogPostSchema>;