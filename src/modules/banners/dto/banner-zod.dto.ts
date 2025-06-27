import { z } from 'zod';

export const baseBannerSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    media_id: z.number().int().positive('Media ID must be a positive integer.'),
    link_url: z.string().url('Link URL must be a valid URL').nullable().optional(),
    position_key: z.string().min(1, 'Position key is required').max(100),
    start_date: z.string().datetime({ message: 'Start date must be a valid ISO 8601 date string.' }).optional(),
    end_date: z.string().datetime({ message: 'End date must be a valid ISO 8601 date string.' }).nullable().optional(),
    display_order: z.number().int().min(0, 'Display order must be a non-negative integer').optional(),
    is_active: z.boolean().optional(),
});

export const updateBannerSchema = baseBannerSchema.partial();
export const createBannerSchema = baseBannerSchema;

export const bannerQuerySchema = z.object({
    page: z.preprocess(Number, z.number().int().min(1).default(1)).optional(),
    limit: z.preprocess(Number, z.number().int().min(1).default(10)).optional(),
    search: z.string().optional(),
    positionKey: z.string().optional(),
    isActive: z.preprocess((val) => val === 'true', z.boolean()).optional(),
    // Add sort and bannerType here
    sort: z.string().optional(), // Define the type for sort, e.g., 'title:asc'
    bannerType: z.enum(['main_banner', 'small_banner']).optional(), // Or whatever your banner types are
});

export type CreateBannerZodDto = z.infer<typeof createBannerSchema>;
export type UpdateBannerZodDto = z.infer<typeof updateBannerSchema>;
export type BannerQueryZodDto = z.infer<typeof bannerQuerySchema>;