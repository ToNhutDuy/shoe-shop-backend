import { z } from 'zod';

export const CreateMediaSchema = z.object({
    default_alt_text: z.string().optional(),
    uploaded_by_user_id: z.number().int().positive().optional(),
});

export type CreateMediaDto = z.infer<typeof CreateMediaSchema>;