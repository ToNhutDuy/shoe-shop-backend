// src/media/dto/create-media.dto.ts
import { z } from 'zod';
import { MediaSchema } from '../schemas/media.schema';

export const CreateMediaSchema = MediaSchema.pick({
    original_file_name: true,
    stored_file_name: true,
    relative_path: true,
    mime_type: true,
    file_size_bytes: true,
    default_alt_text: true,
    file_type: true,
    purpose: true,
    variations: true,
    uploaded_by_user_id: true,
    parent_folder_id: true,
});
export type CreateMediaDto = z.infer<typeof CreateMediaSchema>;

export const UpdateMediaSchema = CreateMediaSchema.partial();
export type UpdateMediaDto = z.infer<typeof UpdateMediaSchema>;