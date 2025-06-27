// src/blog/schemas/blog-post-tag.schema.ts
import { z } from 'zod';

export const BlogPostTagSchema = z.object({
    blog_post_id: z.number().int().positive(),
    tag_id: z.number().int().positive(),
    created_at: z.date().optional(),
});

export type BlogPostTagDto = z.infer<typeof BlogPostTagSchema>;