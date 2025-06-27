// src/blog/dto/blog-category.zod.ts
import { z } from 'zod';


const baseBlogCategorySchema = z.object({
    name: z.string().min(3).max(255),
    description: z.string().max(1000).nullable().optional(),
});

export const createBlogCategorySchema = baseBlogCategorySchema.extend({
    name: z.string().min(3).max(255),


});


export const updateBlogCategorySchema = baseBlogCategorySchema.partial().extend({
    name: z.string().min(3).max(255),
});

export type CreateBlogCategoryZodDto = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryZodDto = z.infer<typeof updateBlogCategorySchema>;
