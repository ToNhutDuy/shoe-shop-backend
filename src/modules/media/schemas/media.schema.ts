// src/modules/media/schemas/media.schema.ts
// This file uses the MediaPurpose enum

import { z } from 'zod';
import { MediaPurpose, FileType } from '../entities/media.entity'; // Make sure all necessary enums are imported

export const MediaSchema = z.object({
    // ... other fields from your Media entity
    original_file_name: z.string().min(1).max(255),
    stored_file_name: z.string().min(1).max(255),
    relative_path: z.string().min(1).max(500),
    mime_type: z.string().min(1).max(100),
    file_size_bytes: z.number().int().min(0),
    default_alt_text: z.string().nullable().optional(),
    file_type: z.nativeEnum(FileType), // Assuming FileType is also correctly defined as a string enum
    purpose: z.nativeEnum(MediaPurpose), // <-- This is the crucial part for the 'purpose' field
    variations: z.record(z.string(), z.object({
        path: z.string(),
        size_bytes: z.number().int().min(0),
        mime_type: z.string(),
    })).nullable().optional(),
    uploaded_by_user_id: z.number().int().positive().nullable().optional(),
    parent_folder_id: z.number().int().positive().nullable().optional(),
    // ... other auto-generated fields like created_at, updated_at, deleted_at if they are part of MediaSchema
});