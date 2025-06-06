export const ALLOWED_IMAGE_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

export const ALLOWED_VIDEO_MIMETYPES = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
];

export const ALLOWED_MEDIA_MIMETYPES = [
    ...ALLOWED_IMAGE_MIMETYPES,
    ...ALLOWED_VIDEO_MIMETYPES,
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB