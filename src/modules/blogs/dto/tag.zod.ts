// src/blog/dto/tag.zod.ts
import { z } from 'zod';


const baseTagSchema = z.object({
    title: z.string().min(2).max(100),
});


export const createTagSchema = baseTagSchema.extend({

    title: z.string().min(2).max(100),
});


export const updateTagSchema = baseTagSchema.partial().extend({
    title: z.string().min(2).max(100),
});

export type CreateTagZodDto = z.infer<typeof createTagSchema>;
export type UpdateTagZodDto = z.infer<typeof updateTagSchema>;
