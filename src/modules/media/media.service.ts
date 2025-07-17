import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, ILike } from 'typeorm';

import { basename, extname, join } from 'path';
import unidecode from 'unidecode';

import * as fs from 'fs-extra'; // Vẫn cần cho các thao tác với file hệ thống (nếu dùng LocalStorageProvider)

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { LocalStorageProvider } from 'src/common/helpers/local-storage.provider';
import { FileType, Media, MediaPurpose } from './entities/media.entity';
import { MediaFolder } from './entities/media-folder.entity';
import { IStorageProvider } from 'src/common/interfaces/storage.interface';
import { UpdateMediaDto } from './dto/create-media.dto';
import { CreateMediaFolderDto, UpdateMediaFolderDto } from './dto/create-media-folder.dto';
import { MediaVariation } from './interfaces';
import { ConfigService } from '@nestjs/config';

// Định nghĩa lại kiểu này cho rõ ràng và nhất quán
export type MediaWithUrls = Media & {
    full_url: string;
    // Bỏ thumbnail_url và medium_url nếu không tạo các phiên bản này nữa
    // Nếu vẫn muốn giữ, cần đảm bảo logic tạo URL phù hợp với việc không có sharp
    thumbnail_url?: string;
    medium_url?: string;
};

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly UPLOADS_ROOT_DIR = process.env.UPLOADS_ROOT_DIR || join(process.cwd(), 'uploads');
    private readonly BACKEND_URL: string;

    constructor(
        @InjectRepository(Media)
        private mediaRepository: Repository<Media>,
        @InjectRepository(MediaFolder)
        private mediaFolderRepository: Repository<MediaFolder>,
        @Inject('STORAGE_PROVIDER')
        private readonly storageProvider: IStorageProvider,
        private readonly configService: ConfigService,
    ) {
        this.BACKEND_URL = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8080/api/v1';
    }

    // --- Phương thức Helper chung để thêm URL vào Media object ---
    private assignMediaUrls(media: Media): MediaWithUrls {
        // Chỉ tạo full_url cho original, loại bỏ thumb/medium nếu không tạo chúng nữa
        const mediaWithUrls: MediaWithUrls = {
            ...media,
            full_url: this.getMediaFullUrl(media.id, 'original'),
            // Nếu không tạo thumbnail/medium, hãy bỏ các dòng này
            thumbnail_url: (media.variations as any)?.thumb ? this.getMediaFullUrl(media.id, 'thumb') : undefined,
            medium_url: (media.variations as any)?.medium ? this.getMediaFullUrl(media.id, 'medium') : undefined,
        };
        return mediaWithUrls;
    }

    // --- Quản lý File Media ---

    async uploadFile(
        file: Express.Multer.File,
        subfolder: string,
        userId: number,
        parentFolderId?: number,
        purpose: MediaPurpose = MediaPurpose.OTHER,
    ): Promise<MediaWithUrls> {
        if (!file) {
            throw new BadRequestException('No file provided.');
        }

        if (parentFolderId) {
            const folderExists = await this.mediaFolderRepository.findOne({ where: { id: parentFolderId } });
            if (!folderExists) {
                throw new NotFoundException(`Folder with ID ${parentFolderId} does not exist or has been deleted.`);
            }
        }

        let storedFileResult;
        const originalFileName = file.originalname;
        const fileType = this.determineFileType(file.mimetype);

        try {

            storedFileResult = await this.storageProvider.uploadFile(file, subfolder);
            this.logger.log(`File uploaded to storage: ${storedFileResult.relativePath}`);
        } catch (uploadError: any) {
            this.logger.error(`Failed to upload file to storage provider: ${uploadError.message}`, uploadError.stack);
            throw new InternalServerErrorException('Could not upload file to storage system.');
        }


        const mediaVariations: { original: MediaVariation } = {
            original: {
                path: storedFileResult.relativePath,
                size_bytes: file.size,
                mime_type: file.mimetype,

            },
        };

        const media = this.mediaRepository.create({
            original_file_name: originalFileName,
            stored_file_name: storedFileResult.storedFileName,
            relative_path: storedFileResult.relativePath,
            mime_type: file.mimetype,
            file_size_bytes: file.size,
            file_type: fileType,
            purpose: purpose,
            uploaded_by_user_id: userId,
            parent_folder_id: parentFolderId || null,
            default_alt_text: basename(file.originalname, extname(file.originalname)),
            variations: mediaVariations,
        });

        try {
            const savedMedia = await this.mediaRepository.save(media);
            this.logger.log(`Media record saved to DB with ID: ${savedMedia.id}`);
            return this.assignMediaUrls(savedMedia);
        } catch (error: any) {

            try {
                await this.storageProvider.deleteFile(storedFileResult.relativePath);

            } catch (deleteErr: any) {
                this.logger.error(`Failed to delete orphaned file ${storedFileResult.relativePath} from storage: ${deleteErr.message}`);
            }
            throw new InternalServerErrorException('System error when saving file information. File has been rolled back.');
        }
    }


    async findAllMedia(
        folderId?: number,
        page: number = 1,
        limit: number = 10,
        search?: string,
    ): Promise<PaginatedResponse<MediaWithUrls>> {
        const queryBuilder = this.mediaRepository
            .createQueryBuilder('media')
            .leftJoinAndSelect('media.uploadedBy', 'user')
            .leftJoinAndSelect('media.parentFolder', 'folder')
            .where('media.deleted_at IS NULL');

        if (folderId !== undefined && folderId !== null) {
            queryBuilder.andWhere('media.parent_folder_id = :folderId', { folderId });
        } else {
            queryBuilder.andWhere('media.parent_folder_id IS NULL');
        }

        if (search) {
            queryBuilder.andWhere(
                '(media.original_file_name ILIKE :search OR media.default_alt_text ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        const [data, totalItems] = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('media.created_at', 'DESC')
            .getManyAndCount();

        const dataWithUrl = data.map(media => this.assignMediaUrls(media));

        const totalPages = Math.ceil(totalItems / limit);
        const itemCount = dataWithUrl.length;

        return {
            data: dataWithUrl,
            meta: {
                currentPage: page,
                itemCount,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }


    async findOneMedia(id: number): Promise<MediaWithUrls> {
        const media = await this.mediaRepository.findOne({
            where: { id, deleted_at: IsNull() },
            relations: ['uploadedBy', 'parentFolder'],
        });
        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found or has been deleted.`);
        }
        return this.assignMediaUrls(media);
    }


    async checkMediaExists(mediaId: number): Promise<boolean> {
        const count = await this.mediaRepository.count({
            where: { id: mediaId, deleted_at: IsNull() }
        });
        return count > 0;
    }


    async updateMedia(id: number, updateMediaDto: UpdateMediaDto): Promise<MediaWithUrls> {
        const media = await this.findOneMedia(id);

        if (updateMediaDto.parent_folder_id !== undefined && updateMediaDto.parent_folder_id !== null) {
            const folderExists = await this.mediaFolderRepository.findOne({ where: { id: updateMediaDto.parent_folder_id, deleted_at: IsNull() } });
            if (!folderExists) {
                throw new NotFoundException(`Folder with ID ${updateMediaDto.parent_folder_id} does not exist or has been deleted.`);
            }
        }


        if (updateMediaDto.original_file_name !== undefined) media.original_file_name = updateMediaDto.original_file_name;
        if (updateMediaDto.default_alt_text !== undefined) media.default_alt_text = updateMediaDto.default_alt_text;
        if (updateMediaDto.purpose !== undefined) media.purpose = updateMediaDto.purpose;
        if (updateMediaDto.parent_folder_id !== undefined) media.parent_folder_id = updateMediaDto.parent_folder_id;

        try {
            const updatedMedia = await this.mediaRepository.save(media);
            this.logger.log(`Media ID ${id} updated successfully.`);
            return this.assignMediaUrls(updatedMedia);
        } catch (error: any) {
            this.logger.error(`Failed to update media ID ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to update media. Please check data or try again.');
        }
    }


    async removeMedia(id: number, hardDeleteFile: boolean = false): Promise<void> {
        const media = await this.mediaRepository.findOne({ where: { id, deleted_at: IsNull() } });
        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found or has been deleted.`);
        }


        await this.mediaRepository.softRemove(media);
        this.logger.log(`Soft-deleted media record with ID: ${id}`);

        if (hardDeleteFile) {
            this.logger.log(`Attempting to hard delete physical files for media ID: ${id}`);
            const filesToDelete: string[] = [];

            if (media.relative_path) {
                filesToDelete.push(media.relative_path);
            }

            // const typedVariations: { [key: string]: MediaVariation | undefined; } | null | undefined = media.variations as any;
            // if (typedVariations && typeof typedVariations === 'object') {
            //   for (const key in typedVariations) {
            //     if (Object.prototype.hasOwnProperty.call(typedVariations, key)) {
            //       const variation = typedVariations[key];
            //       if (variation?.path) {
            //         filesToDelete.push(variation.path);
            //       }
            //     }
            //   }
            // }


            await Promise.all(filesToDelete.map(async (path) => {
                try {
                    await this.storageProvider.deleteFile(path);
                    this.logger.log(`Successfully hard-deleted physical file: ${path}`);
                } catch (error: any) {
                    this.logger.error(`Failed to hard-delete physical file ${path}: ${error.message}`, error.stack);
                }
            }));
        }
    }

    // --- Quản lý Thư mục Media ---


    async createFolder(createFolderDto: CreateMediaFolderDto, createdByUserId: number): Promise<MediaFolder> {
        const { name, parent_folder_id } = createFolderDto;
        const slug = unidecode(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');

        const existingFolder = await this.mediaFolderRepository.findOne({
            where: {
                name: name,
                parent_folder_id: parent_folder_id || IsNull(),
                deleted_at: IsNull(), // Đảm bảo thư mục hiện có chưa bị xóa mềm
            }
        });
        if (existingFolder) {
            throw new BadRequestException(`Folder with name '${name}' already exists in this directory.`);
        }

        if (parent_folder_id) {
            const parentExists = await this.mediaFolderRepository.findOne({ where: { id: parent_folder_id, deleted_at: IsNull() } });
            if (!parentExists) {
                throw new NotFoundException(`Parent folder with ID ${parent_folder_id} does not exist or has been deleted.`);
            }
        }

        const folder = this.mediaFolderRepository.create({
            name,
            slug,
            parent_folder_id: parent_folder_id || null,
            created_by_user_id: createdByUserId,
        });
        try {
            return await this.mediaFolderRepository.save(folder);
        } catch (error: any) {
            this.logger.error(`Failed to create folder: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to create folder. Please try again.');
        }
    }

    async findAllFolders(
        parentFolderId?: number,
        page: number = 1,
        limit: number = 10,
        search?: string,
    ): Promise<PaginatedResponse<MediaFolder>> {
        const queryBuilder = this.mediaFolderRepository
            .createQueryBuilder('folder')
            .leftJoinAndSelect('folder.createdBy', 'user')
            .where('folder.deleted_at IS NULL');

        if (parentFolderId !== undefined && parentFolderId !== null) {
            queryBuilder.andWhere('folder.parent_folder_id = :parentFolderId', { parentFolderId });
        } else {
            queryBuilder.andWhere('folder.parent_folder_id IS NULL');
        }

        if (search) {
            queryBuilder.andWhere('folder.name ILIKE :search', { search: `%${search}%` });
        }

        const [folders, totalItems] = await queryBuilder
            .orderBy('folder.name', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const itemCount = folders.length;

        return {
            data: folders,
            meta: {
                currentPage: page,
                itemCount,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }


    async findOneFolder(id: number): Promise<MediaFolder> {
        const folder = await this.mediaFolderRepository.findOne({
            where: { id, deleted_at: IsNull() }, // Chỉ tìm các thư mục chưa bị xóa mềm
            relations: ['createdBy', 'parentFolder', 'childrenFolders', 'media'],
        });
        if (!folder) {
            throw new NotFoundException(`Folder with ID ${id} not found or has been deleted.`);
        }
        return folder;
    }

    async updateFolder(id: number, updateFolderDto: UpdateMediaFolderDto): Promise<MediaFolder> {
        const folder = await this.findOneFolder(id);

        if (updateFolderDto.name && updateFolderDto.name !== folder.name) {
            const existingFolderWithSameName = await this.mediaFolderRepository.findOne({
                where: {
                    name: updateFolderDto.name,
                    parent_folder_id: updateFolderDto.parent_folder_id || folder.parent_folder_id || IsNull(),
                    id: Not(id),
                    deleted_at: IsNull(),
                }
            });
            if (existingFolderWithSameName) {
                throw new BadRequestException(`Folder with name '${updateFolderDto.name}' already exists in this directory.`);
            }
            folder.name = updateFolderDto.name;
            folder.slug = unidecode(updateFolderDto.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');
        }

        if (updateFolderDto.parent_folder_id !== undefined) {
            if (updateFolderDto.parent_folder_id === id) {
                throw new BadRequestException('Cannot set a folder as its own parent.');
            }

            if (updateFolderDto.parent_folder_id !== null) {
                const parentExists = await this.mediaFolderRepository.findOne({ where: { id: updateFolderDto.parent_folder_id, deleted_at: IsNull() } });
                if (!parentExists) {
                    throw new NotFoundException(`Parent folder with ID ${updateFolderDto.parent_folder_id} does not exist or has been deleted.`);
                }
                // Simple check for circular reference (not a full tree traversal)
                if (parentExists.parent_folder_id === id) { // Direct parent-child loop
                    throw new BadRequestException('New parent folder cannot be a direct child of the current folder.');
                }
            }
            folder.parent_folder_id = updateFolderDto.parent_folder_id;
        }

        try {
            return await this.mediaFolderRepository.save(folder);
        } catch (error: any) {
            this.logger.error(`Failed to update folder ID ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to update folder. Please check data or try again.');
        }
    }


    async removeFolder(id: number): Promise<void> {
        const folder = await this.mediaFolderRepository.findOne({ where: { id, deleted_at: IsNull() } });
        if (!folder) {
            throw new NotFoundException(`Folder with ID ${id} not found or has been deleted.`);
        }

        const hasMedias = await this.mediaRepository.count({
            where: { parent_folder_id: id, deleted_at: IsNull() }
        });
        const hasChildren = await this.mediaFolderRepository.count({
            where: { parent_folder_id: id, deleted_at: IsNull() }
        });

        if (hasMedias > 0 || hasChildren > 0) {
            throw new BadRequestException('Folder is not empty (contains undeleted files or subfolders). Please move or delete its contents first.');
        }

        await this.mediaFolderRepository.softRemove(folder);
        this.logger.log(`Soft-deleted folder with ID: ${id}`);
    }




    getMediaFullUrl(mediaId: number, version: 'original' | 'thumb' | 'medium' = 'original'): string {

        return `${this.BACKEND_URL}/media/stream/${mediaId}?v=original`;
    }
    private determineFileType(mimeType: string): FileType {
        if (!mimeType) return FileType.OTHER;
        if (mimeType.startsWith('image/')) return FileType.IMAGE;
        if (mimeType.startsWith('video/')) return FileType.VIDEO;
        if (
            mimeType === 'application/pdf' ||
            mimeType.includes('msword') ||
            mimeType.includes('officedocument.wordprocessingml') ||
            mimeType.includes('spreadsheetml') ||
            mimeType.includes('presentationml') ||
            mimeType.startsWith('text/')
        ) {
            return FileType.DOCUMENT;
        }
        return FileType.OTHER;
    }



    async deleteFileFromDisk(filePath: string): Promise<void> {
        this.logger.debug(`Attempting to delete file from disk: ${filePath}`);
        try {
            await this.storageProvider.deleteFile(filePath);
            this.logger.log(`File deleted successfully from storage: ${filePath}`);
        } catch (error: any) {
            this.logger.error(`Failed to delete file: ${error.message} with path ${filePath}`, error.stack);
            throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
        }
    }


}