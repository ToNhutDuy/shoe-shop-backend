// src/media/dto/create-media-folder.dto.ts
import { z } from 'zod';
import { MediaFolderSchema } from '../schemas/media-folder.schema';

export const CreateMediaFolderSchema = MediaFolderSchema.pick({
    name: true,
    parent_folder_id: true,
});
export type CreateMediaFolderDto = z.infer<typeof CreateMediaFolderSchema>;

export const UpdateMediaFolderSchema = CreateMediaFolderSchema.partial();
export type UpdateMediaFolderDto = z.infer<typeof UpdateMediaFolderSchema>;