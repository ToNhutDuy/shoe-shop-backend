import { z } from 'zod';
import { CmsPageStatus } from '../entities/cms-page.entity'; // Import the enum

// --- Base Schema ---
export const BaseCmsPageSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly (lowercase, alphanumeric, hyphens)'),
    content_html: z.string().min(1, 'Content is required'),
    status: z.nativeEnum(CmsPageStatus).default(CmsPageStatus.PUBLISHED),
    meta_title: z.string().max(255).nullable().optional(),
});

// --- Create DTO ---
export const CreateCmsPageZodSchema = BaseCmsPageSchema;
export type CreateCmsPageZodDto = z.infer<typeof CreateCmsPageZodSchema>;

// --- Update DTO ---
// All fields are optional for update
export const UpdateCmsPageZodSchema = BaseCmsPageSchema.partial();
export type UpdateCmsPageZodDto = z.infer<typeof UpdateCmsPageZodSchema>;

// --- Query DTO for Listing ---
export const CmsPageQueryZodSchema = z.object({
    page: z.preprocess(Number, z.number().int().min(1).default(1)).optional(),
    limit: z.preprocess(Number, z.number().int().min(1).max(100).default(10)).optional(),
    search: z.string().optional(), // For searching by title or content
    status: z.nativeEnum(CmsPageStatus).optional(),
}).partial(); // Make all query params optional by default
export type CmsPageQueryZodDto = z.infer<typeof CmsPageQueryZodSchema>;