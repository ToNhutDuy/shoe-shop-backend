// src/common/storage/storage.interface.ts

import { ReadStream, Stats } from 'fs';
import { Readable } from 'stream';


export interface IStorageProvider {

    uploadFile(
        file: Express.Multer.File,
        subfolder: string,
    ): Promise<{ storedFileName: string; relativePath: string; url: string }>;


    deleteFile(relativePath: string): Promise<void>;


    getFileStream(relativePath: string, range?: string | { start: number, end: number }): Promise<{ stream: ReadStream | Readable; stat: Stats | { size: number }; contentType: string }>;


    getFileMetadata(relativePath: string): Promise<{ size: number; contentType: string }>;
}