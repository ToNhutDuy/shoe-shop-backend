import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';

import { join, extname, basename } from 'path';
import { existsSync, unlinkSync, promises as fsPromises } from 'fs';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

import { ALLOWED_IMAGE_MIMETYPES, ALLOWED_MEDIA_MIMETYPES, MAX_FILE_SIZE_BYTES } from './constants/media-mimetypes.constant';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import sharp from 'sharp';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MediaService {

    private readonly uploadBaseDir: string;

    private readonly originalFilesDir: string;

    private readonly thumbnailsDir: string;

    private readonly mediumImagesDir: string;

    constructor(
        @InjectRepository(Media)
        private mediaRepository: Repository<Media>,
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        this.uploadBaseDir = this.configService.get<string>('UPLOAD_BASE_DIR', './uploads');
        this.originalFilesDir = join(this.uploadBaseDir, 'media', 'original');
        this.thumbnailsDir = join(this.uploadBaseDir, 'media', 'thumbnails');
        this.mediumImagesDir = join(this.uploadBaseDir, 'media', 'medium');

        this.ensureUploadDirectoriesExist();
    }


    private async ensureUploadDirectoriesExist() {
        try {
            await fsPromises.mkdir(this.originalFilesDir, { recursive: true });
            await fsPromises.mkdir(this.thumbnailsDir, { recursive: true });
            await fsPromises.mkdir(this.mediumImagesDir, { recursive: true });
        } catch (error) {
            console.error('Khởi tạo thư mục lưu trữ media thất bại:', error);

            throw new InternalServerErrorException('Khởi tạo thư mục lưu trữ media thất bại.');
        }
    }


    async createMediaRecord(file: Express.Multer.File, createMediaDto: CreateMediaDto): Promise<Media> {
        // 1. Kiểm tra file hợp lệ

        if (!file) {
            throw new BadRequestException('Không có tệp nào được cung cấp.');
        }
        if (!ALLOWED_MEDIA_MIMETYPES.includes(file.mimetype)) {
            throw new BadRequestException(`Loại tệp "${file.mimetype}" không được phép.`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException(`Kích thước tệp vượt quá giới hạn ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
        }

        // 2. Kiểm tra người upload nếu có
        let uploadedByUser: User | null = null;
        if (createMediaDto.uploaded_by_user_id) {
            uploadedByUser = await this.usersService.findOneById(createMediaDto.uploaded_by_user_id);
            if (!uploadedByUser) {
                throw new BadRequestException(`Không tìm thấy người dùng với ID ${createMediaDto.uploaded_by_user_id}.`);
            }
        }

        // 3. Chuẩn bị thông tin file
        const fileExtension = extname(file.originalname);
        // Multer đã đặt tên file duy nhất. Chúng ta dùng tên đó.
        const uniqueFileName = file.filename;
        const relativePathOriginal = join('media', 'original', uniqueFileName); // Đường dẫn tương đối cho file gốc
        const filePathOriginal = join(this.uploadBaseDir, relativePathOriginal); // Đường dẫn vật lý cho file gốc

        // 4. Xác định loại file (image, video, etc.)
        let fileType: Media['file_type'] = 'other';
        if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
            fileType = 'image';
        } else if (file.mimetype.startsWith('video/')) { // Kiểm tra tiền tố mimetype cho video
            fileType = 'video';
        } else if (file.mimetype.startsWith('application/pdf') || file.mimetype.includes('document')) { // Ví dụ cho document
            fileType = 'document';
        } else {
            fileType = 'other';
        }


        // 5. Tạo bản ghi Media ban đầu
        const media = this.mediaRepository.create({
            original_file_name: file.originalname,
            stored_file_name: uniqueFileName,
            relative_path: relativePathOriginal,
            mime_type: file.mimetype,
            file_size_bytes: file.size,
            default_alt_text: createMediaDto.default_alt_text || file.originalname,
            file_type: fileType,
            uploaded_by_user_id: uploadedByUser ? uploadedByUser.id : null,
            uploadedBy: uploadedByUser, // Gán đối tượng user nếu có
        });

        // 6. Xử lý hình ảnh nếu là file ảnh
        if (fileType === 'image') {
            try {
                const baseNameWithoutExt = basename(uniqueFileName, fileExtension);
                // Luôn chuyển đổi sang webp để tối ưu cho web
                const webpExtension = '.webp';

                // Tạo thumbnail (150x150)
                const thumbnailName = `${baseNameWithoutExt}_thumb${webpExtension}`;
                const thumbnailPath = join(this.thumbnailsDir, thumbnailName);
                await sharp(filePathOriginal)
                    .resize(150, 150, { fit: sharp.fit.cover, background: { r: 0, g: 0, b: 0, alpha: 0 } }) // Giữ tỷ lệ, cắt và nền trong suốt
                    .toFormat('webp')
                    .toFile(thumbnailPath);
                media.thumbnail_path = join('media', 'thumbnails', thumbnailName);

                // Tạo phiên bản kích thước trung bình (chiều rộng 800px)
                const mediumName = `${baseNameWithoutExt}_medium${webpExtension}`;
                const mediumPath = join(this.mediumImagesDir, mediumName);
                await sharp(filePathOriginal)
                    .resize({ width: 800, withoutEnlargement: true }) // Không phóng to nếu ảnh nhỏ hơn
                    .toFormat('webp')
                    .toFile(mediumPath);
                media.medium_path = join('media', 'medium', mediumName);

            } catch (imageProcessingError) {
                console.error(`Error processing image ${uniqueFileName}:`, imageProcessingError);

            }
        }

        // 7. Lưu bản ghi Media vào cơ sở dữ liệu
        try {
            return await this.mediaRepository.save(media);
        } catch (dbError) {
            // Nếu lưu DB thất bại, xóa file vật lý đã upload để tránh rác
            if (existsSync(filePathOriginal)) {
                await fsPromises.unlink(filePathOriginal);
                console.warn(`Đã xóa tệp vật lý ${filePathOriginal} do lỗi lưu DB.`);
            }
            if (media.thumbnail_path && existsSync(join(this.uploadBaseDir, media.thumbnail_path))) {
                await fsPromises.unlink(join(this.uploadBaseDir, media.thumbnail_path));
            }
            if (media.medium_path && existsSync(join(this.uploadBaseDir, media.medium_path))) {
                await fsPromises.unlink(join(this.uploadBaseDir, media.medium_path));
            }
            throw new InternalServerErrorException('Lưu bản ghi media vào cơ sở dữ liệu thất bại.');
        }
    }


    async findAll(): Promise<Media[]> {
        return this.mediaRepository.find({ relations: ['uploadedBy'] });
    }


    async findOne(id: number): Promise<Media> {
        const media = await this.mediaRepository.findOne({
            where: { id },
            relations: ['uploadedBy'],
        });
        if (!media) {
            throw new NotFoundException(`Media với ID ${id} không tìm thấy.`);
        }
        return media;
    }

    async update(id: number, updateMediaDto: UpdateMediaDto): Promise<Media> {
        const media = await this.mediaRepository.preload({ id, ...updateMediaDto });
        if (!media) {
            throw new NotFoundException(`Media với ID ${id} không tìm thấy.`);
        }

        if (updateMediaDto.uploaded_by_user_id !== undefined) {
            if (updateMediaDto.uploaded_by_user_id === null) {
                media.uploadedBy = null;
                media.uploaded_by_user_id = null;
            } else {

                const user: User | null = await this.usersService.findOneById(updateMediaDto.uploaded_by_user_id); // <-- Đảm bảo gọi findOneById và user có kiểu User | null
                if (!user) {
                    throw new BadRequestException(`Không tìm thấy người dùng với ID ${updateMediaDto.uploaded_by_user_id}.`);
                }
                media.uploadedBy = user;
                media.uploaded_by_user_id = user.id;
            }
        }

        return this.mediaRepository.save(media);
    }


    async remove(id: number): Promise<void> {
        const media = await this.mediaRepository.findOne({ where: { id } });
        if (!media) {
            throw new NotFoundException(`Media với ID ${id} không tìm thấy.`);
        }

        // Danh sách các đường dẫn file vật lý cần xóa
        const filesToDeleteRelativePaths = [
            media.relative_path,     // File gốc
            media.thumbnail_path,    // Thumbnail
            media.medium_path,       // Ảnh kích thước trung bình
        ].filter(Boolean); // Lọc bỏ các giá trị null/undefined

        // Xóa từng file vật lý
        for (const relativePath of filesToDeleteRelativePaths) {
            const filePath = join(this.uploadBaseDir, relativePath);
            if (existsSync(filePath)) {
                try {
                    await fsPromises.unlink(filePath); // Xóa file
                    console.log(`Đã xóa tệp vật lý: ${filePath}`);
                } catch (error) {
                    console.error(`Lỗi khi xóa tệp vật lý ${filePath}:`, error);
                    // Ghi log lỗi nhưng vẫn tiếp tục để cố gắng xóa các file khác và bản ghi DB
                }
            }
        }

        // Xóa bản ghi khỏi cơ sở dữ liệu
        const result = await this.mediaRepository.delete(id);
        if (result.affected === 0) {
            // Trường hợp này hiếm khi xảy ra nếu đã tìm thấy media ở trên
            throw new NotFoundException(`Media với ID ${id} không tìm thấy hoặc đã bị xóa.`);
        }
    }

    getPublicUrl(mediaRecord: Media, size: 'original' | 'thumbnail' | 'medium' = 'original'): string {
        const baseUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
        let pathSegment: string | null = null;

        if (size === 'thumbnail' && mediaRecord.thumbnail_path) {
            pathSegment = mediaRecord.thumbnail_path;
        } else if (size === 'medium' && mediaRecord.medium_path) {
            pathSegment = mediaRecord.medium_path;
        } else { // Mặc định hoặc nếu kích thước yêu cầu không có
            pathSegment = mediaRecord.relative_path;
        }

        if (!pathSegment) {
            // Fallback an toàn nếu không tìm thấy đường dẫn nào
            return `${baseUrl}/uploads/placeholder.png`;
        }
        return `${baseUrl}/uploads/${pathSegment}`;
    }
}