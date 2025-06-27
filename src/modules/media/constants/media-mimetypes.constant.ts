export const ALLOWED_IMAGE_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];

export const ALLOWED_VIDEO_MIMETYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
];

export const ALLOWED_DOCUMENT_MIMETYPES = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;