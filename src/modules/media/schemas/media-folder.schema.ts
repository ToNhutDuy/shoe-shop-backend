// src/media/schemas/media-folder.schema.ts
import { z } from 'zod';

export const MediaFolderSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().max(255),
    slug: z.string().max(255),
    parent_folder_id: z.number().int().positive().nullable().optional(),
    created_by_user_id: z.number().int().positive().nullable().optional(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type MediaFolderDto = z.infer<typeof MediaFolderSchema>;