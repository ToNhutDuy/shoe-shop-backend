import { z } from 'zod';


export const CreateShippingProviderSchema = z.object({
    name: z.string().min(1).max(255),
    logo_media_id: z.number().int().positive().optional().nullable(),
    api_key: z.string().max(255).optional().nullable(),
    webhook_url: z.string().url().max(255).optional().nullable(),
    is_active: z.boolean().default(true).optional(),
});

export type CreateShippingProviderDto = z.infer<typeof CreateShippingProviderSchema>;


export const UpdateShippingProviderSchema = z.object({
    name: z.string().max(255).optional(),
    logo_media_id: z.number().int().positive().optional().nullable(),
    api_key: z.string().max(255).optional().nullable(),
    webhook_url: z.string().url().max(255).optional().nullable(),
    is_active: z.boolean().optional(),
}).partial();

export type UpdateShippingProviderDto = z.infer<typeof UpdateShippingProviderSchema>;