// src/common/storage/local-storage.provider.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs-extra';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ReadStream, Stats } from 'fs';
import { IStorageProvider } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
    private readonly logger = new Logger(LocalStorageProvider.name);
    private readonly UPLOADS_ROOT_DIR: string;

    constructor() {
        this.UPLOADS_ROOT_DIR = join(__dirname, '../../..', 'uploads');

        if (!fs.existsSync(this.UPLOADS_ROOT_DIR)) {
            fs.mkdirSync(this.UPLOADS_ROOT_DIR, { recursive: true });
            this.logger.log(`Created uploads root directory: ${this.UPLOADS_ROOT_DIR}`);
        }
    }

    async uploadFile(file: Express.Multer.File, subfolder: string): Promise<{ storedFileName: string; relativePath: string; url: string }> {
        const uploadDir = join(this.UPLOADS_ROOT_DIR, subfolder);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            this.logger.debug(`Created subfolder directory: ${uploadDir}`);
        }

        const fileExtension = extname(file.originalname);
        const storedFileName = `${uuidv4()}${fileExtension}`;
        const filePath = join(uploadDir, storedFileName);

        try {
            await fs.writeFile(filePath, file.buffer);
            this.logger.log(`File saved locally: ${filePath}`);
        } catch (error) {
            this.logger.error(`Failed to save file locally: ${error.message}`);
            throw new Error('Không thể lưu file vào hệ thống cục bộ.');
        }

        const relativePath = join(subfolder, storedFileName).replace(/\\/g, '/');

        const url = `/media/stream/placeholder_id`;
        return { storedFileName, relativePath, url };
    }

    async deleteFile(relativePath: string): Promise<void> {
        const filePath = join(this.UPLOADS_ROOT_DIR, relativePath);
        try {
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                this.logger.log(`Deleted local file: ${filePath}`);
            } else {
                this.logger.warn(`Local file not found for deletion: ${filePath}`);
            }
        } catch (error) {
            this.logger.error(`Failed to delete local file ${filePath}: ${error.message}`);
            throw new Error(`Xóa tệp cục bộ không thành công: ${error.message}`);
        }
    }

    async getFileStream(relativePath: string, range?: string): Promise<{ stream: ReadStream; stat: Stats; contentType: string }> {
        const filePath = join(this.UPLOADS_ROOT_DIR, relativePath);

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('Local file not found for streaming.');
        }

        const stat = fs.statSync(filePath);
        const contentType = this.getMimeTypeFromPath(filePath);

        let stream: ReadStream;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            stream = fs.createReadStream(filePath, { start, end });
        } else {
            stream = fs.createReadStream(filePath);
        }
        return { stream, stat, contentType };
    }

    async getFileMetadata(relativePath: string): Promise<{ size: number; contentType: string }> {
        const filePath = join(this.UPLOADS_ROOT_DIR, relativePath);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('Local file not found for metadata.');
        }
        const stat = fs.statSync(filePath);
        const contentType = this.getMimeTypeFromPath(filePath);
        return { size: stat.size, contentType };
    }

    private getMimeTypeFromPath(filePath: string): string {
        const extension = extname(filePath).toLowerCase();
        switch (extension) {
            case '.mp4': return 'video/mp4';
            case '.webm': return 'video/webm';
            case '.ogg': return 'video/ogg';
            case '.mp3': return 'audio/mpeg';
            case '.wav': return 'audio/wav';
            case '.jpg':
            case '.jpeg': return 'image/jpeg';
            case '.png': return 'image/png';
            case '.gif': return 'image/gif';
            case '.pdf': return 'application/pdf';
            case '.doc': return 'application/msword';
            case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case '.xls': return 'application/vnd.ms-excel';
            case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case '.ppt': return 'application/vnd.ms-powerpoint';
            case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            case '.txt': return 'text/plain';
            default: return 'application/octet-stream';
        }
    }
}