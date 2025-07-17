import {
  Controller, Get, Post, Put, Delete, Param, Body, UseInterceptors, UploadedFile
  , ParseIntPipe, Query, Res, Logger, BadRequestException, UsePipes, ValidationPipe, HttpStatus, NotFoundException,
  UseGuards, HttpCode, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'
import { Response, Request } from 'express';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ResponseMessage, Public } from 'src/common/decorators/public.decorator';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';

import { AuthGuard } from '@nestjs/passport';

import { MediaService } from './media.service';
import { storageConfig } from 'src/config/storage.config';
import { Media, MediaPurpose } from './entities/media.entity';
import { MediaFolder } from './entities/media-folder.entity';
import { User } from 'src/common/decorators/user.decorator';
import { CreateMediaFolderDto, UpdateMediaFolderDto } from './dto/create-media-folder.dto';
import { UpdateMediaDto } from './dto/create-media.dto';
import { createReadStream, existsSync } from 'fs-extra';
import { join } from 'path';


@Controller('media')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) { }


  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', {
    storage: storageConfig('files'),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req: Request, file: Express.Multer.File, cb: Function) => {
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg',
        'audio/mpeg', 'audio/wav', 'audio/flac',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        cb(new BadRequestException('Loại file không được hỗ trợ!'), false);
      } else {
        cb(null, true);
      }
    }
  }))

  @Get(':id')
  async getMediaFile(@Param('id') mediaId: number, @Res() res: Response) {
    // Tìm thông tin media từ database bằng mediaId
    const media = await this.mediaService.findOneMedia(mediaId); // Hàm findOneMedia trả về đối tượng Media

    if (!media || !media.relative_path) {
      throw new NotFoundException(`Media with ID ${mediaId} not found.`);
    }

    // Tạo đường dẫn tuyệt đối đến file
    // Giả sử các file tải lên được lưu trong thư mục 'uploads' ở thư mục gốc của backend
    const filePath = join(process.cwd(), 'uploads', media.relative_path);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`File not found at path: ${media.relative_path}`);
    }

    // Thiết lập header và stream file về client
    res.set({
      'Content-Type': media.mime_type || 'application/octet-stream', // Đảm bảo đúng MIME type
      'Content-Disposition': `inline; filename="${media.original_file_name}"`, // Hoặc attachment
    });

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }
  @ResponseMessage('Tải lên file phương tiện thành công')
  async uploadFile(
    @User('userId') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('parentFolderId', new ParseIntPipe({ optional: true })) parentFolderId?: number,
    @Body('purpose') purpose?: MediaPurpose,
  ): Promise<Media & { full_url: string }> {
    if (!file) {
      throw new BadRequestException('Không có file nào được tải lên.');
    }
    const finalPurpose: MediaPurpose = purpose && Object.values(MediaPurpose).includes(purpose)
      ? purpose
      : MediaPurpose.OTHER;

    this.logger.log(`Người dùng ID ${userId} đang tải lên file: "${file.originalname}" với mục đích "${finalPurpose}" vào thư mục cha ${parentFolderId || 'gốc'}.`);

    const mediaRecord = await this.mediaService.uploadFile(
      file,
      'files',
      userId,
      parentFolderId,
      finalPurpose
    );
    return mediaRecord;
  }

  @Get('files')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Lấy danh sách file phương tiện thành công')
  async getAllMediaFiles(
    @Query('folderId', new ParseIntPipe({ optional: true })) folderId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<Media & { full_url: string }>> {
    this.logger.log(`Đang lấy danh sách file với folderId: ${folderId || 'tất cả'}, tìm kiếm: "${search || 'none'}", trang: ${page}, giới hạn: ${limit}.`);
    return this.mediaService.findAllMedia(folderId, page, limit, search);
  }

  @Get('files/:id')
  @Public()
  @ResponseMessage('Lấy thông tin file phương tiện thành công')
  async getMediaFileById(@Param('id', ParseIntPipe) id: number): Promise<Media & { full_url: string }> {
    this.logger.log(`Đang lấy thông tin file với ID: ${id}.`);
    return this.mediaService.findOneMedia(id);
  }


  @Put('files/:id')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Cập nhật file phương tiện thành công')
  async updateMediaFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMediaDto: UpdateMediaDto,
  ): Promise<Media & { full_url: string }> {
    this.logger.log(`Đang cập nhật file với ID: ${id}. Dữ liệu cập nhật: ${JSON.stringify(updateMediaDto)}`);
    return this.mediaService.updateMedia(id, updateMediaDto);
  }

  @Delete('files/:id')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Xóa file phương tiện thành công')
  @HttpCode(HttpStatus.OK)
  async deleteMediaFile(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    this.logger.log(`Đang xóa file với ID: ${id}.`);
    await this.mediaService.removeMedia(id);
    return { message: `Media file với ID ${id} đã được xóa thành công.` };
  }

  @Post('folders')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Tạo thư mục phương tiện thành công')
  async createFolder(
    @Body() createFolderDto: CreateMediaFolderDto,
    @User('userId') createdByUserId: number,
  ): Promise<MediaFolder> {
    this.logger.log(`Người dùng ID ${createdByUserId} đang tạo thư mục: "${createFolderDto.name}" trong thư mục cha ${createFolderDto.parent_folder_id || 'gốc'}.`);
    return this.mediaService.createFolder(createFolderDto, createdByUserId);
  }

  @Get('folders')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Lấy danh sách thư mục thành công')
  async getAllFolders(
    @Query('parentFolderId', new ParseIntPipe({ optional: true })) parentFolderId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<MediaFolder>> {
    this.logger.log(`Đang lấy danh sách thư mục với parentFolderId: ${parentFolderId || 'tất cả'}, tìm kiếm: "${search || 'none'}", trang: ${page}, giới hạn: ${limit}.`);
    return this.mediaService.findAllFolders(parentFolderId, page, limit, search);
  }

  @Get('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Lấy thông tin thư mục thành công')
  async getFolderById(@Param('id', ParseIntPipe) id: number): Promise<MediaFolder> {
    this.logger.log(`Đang lấy thông tin thư mục với ID: ${id}.`);
    return this.mediaService.findOneFolder(id);
  }

  @Put('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Cập nhật thư mục thành công')
  async updateFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFolderDto: UpdateMediaFolderDto,
  ): Promise<MediaFolder> {
    this.logger.log(`Đang cập nhật thư mục với ID: ${id}. Dữ liệu cập nhật: ${JSON.stringify(updateFolderDto)}`);
    return this.mediaService.updateFolder(id, updateFolderDto);
  }

  @Delete('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Xóa thư mục thành công')
  @HttpCode(HttpStatus.OK)
  async deleteFolder(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    this.logger.log(`Đang xóa thư mục với ID: ${id}.`);
    await this.mediaService.removeFolder(id);
    return { message: `Thư mục với ID ${id} đã được xóa thành công. (Chỉ khi trống)` };
  }
}
