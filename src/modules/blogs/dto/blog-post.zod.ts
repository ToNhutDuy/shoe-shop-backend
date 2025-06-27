// src/blog/dto/blog-post.zod.ts
import { z } from 'zod';
export enum BlogPostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

const baseBlogPostSchema = z.object({
    title: z.string().min(5).max(255),
    content_html: z.string().min(10),
    excerpt: z.string().max(500).nullable().optional(),
    blog_category_id: z.number().int().positive(),
    author_user_id: z.number().int().positive().nullable().optional(),
    featured_image_media_id: z.number().int().positive().nullable().optional(),
    status: z.nativeEnum(BlogPostStatus, {
        errorMap: () => ({ message: `Status must be one of: ${Object.values(BlogPostStatus).join(', ')}` }),
    }).default(BlogPostStatus.DRAFT).optional(),
    published_at: z.string().datetime().nullable().optional(),
});

export const createBlogPostSchema = baseBlogPostSchema.extend({
    title: z.string().min(5).max(255),


    tag_ids: z.array(z.number().int().positive()).optional(),
})
    .refine(data => {

        if (data.status === BlogPostStatus.PUBLISHED && !data.published_at) {
            return false;
        }
        return true;
    }, {
        message: "published_at is required when status is 'published'",
        path: ["published_at"],
    })
    .refine(data => {

        if (data.published_at && new Date(data.published_at) > new Date()) {
            return false;
        }
        return true;
    }, {
        message: "published_at cannot be in the future",
        path: ["published_at"],
    });

export const updateBlogPostSchema = baseBlogPostSchema.partial().extend({
    title: z.string().min(5).max(255),
    tag_ids: z.array(z.number().int().positive()).optional(),
})
    .refine(data => {

        if (data.status === BlogPostStatus.PUBLISHED && !data.published_at) {
            return false;
        }
        return true;
    }, {
        message: "published_at is required when status is 'published'",
        path: ["published_at"],
    })
    .refine(data => {

        if (data.published_at && new Date(data.published_at) > new Date()) {
            return false;
        }
        return true;
    }, {
        message: "published_at cannot be in the future",
        path: ["published_at"],
    });

export type CreateBlogPostZodDto = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostZodDto = z.infer<typeof updateBlogPostSchema>;
