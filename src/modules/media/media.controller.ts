import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Res,
  UsePipes,
  BadRequestException,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { CreateMediaDto, CreateMediaSchema } from './dto/create-media.dto';

import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { existsSync } from 'fs';
import { ApiTags, ApiConsumes, ApiBody, ApiProperty, ApiResponse } from '@nestjs/swagger';

import { ALLOWED_MEDIA_MIMETYPES, MAX_FILE_SIZE_BYTES } from './constants/media-mimetypes.constant';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { Media } from './entities/media.entity';
import { UpdateMediaDto, UpdateMediaSchema } from './dto/update-media.dto';
import { ResponseMessage } from 'src/common/decorators/public.decorator';

// Class giả định để mô tả file/files upload cho Swagger
class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Tệp để tải lên' })
  file: any;
}

class FilesUploadDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Mảng các tệp để tải lên' })
  files: Array<any>;
}


@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  // --- SINGLE FILE UPLOAD ---
  @Post('upload-single')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Luôn lưu file gốc vào thư mục 'original'
          cb(null, join(process.cwd(), 'uploads', 'media', 'original'));
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MEDIA_MIMETYPES.includes(file.mimetype)) {
          return cb(new BadRequestException(`Loại tệp ${file.mimetype} không được phép!`), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        default_alt_text: { type: 'string' },
        uploaded_by_user_id: { type: 'number' },
      },
    },
  })
  @ResponseMessage('Tải lên tệp media thành công')
  @UsePipes(new ZodValidationPipe(CreateMediaSchema))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() createMediaDto: CreateMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Không có tệp nào được tải lên.');
    }
    return this.mediaService.createMediaRecord(file, createMediaDto);
  }

  // --- MULTIPLE FILES UPLOAD ---
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, { // 'files' là tên trường trong form-data, 10 là số lượng tệp tối đa
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'media', 'original'));
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MEDIA_MIMETYPES.includes(file.mimetype)) {
          return cb(new BadRequestException(`Loại tệp ${file.mimetype} không được phép!`), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES, // Giới hạn kích thước MỖI tệp
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        default_alt_text: { type: 'string' },
        uploaded_by_user_id: { type: 'number' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(CreateMediaSchema))
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tải lên nhiều tệp media thành công')
  async uploadMultiple(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() createMediaDto: CreateMediaDto,
  ) {
    const uploadedMedia: Media[] = [];
    for (const file of files) {
      const mediaRecord = await this.mediaService.createMediaRecord(file, createMediaDto);
      uploadedMedia.push(mediaRecord);
    }
    return uploadedMedia;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy danh sách tệp media thành công')
  findAll() {
    return this.mediaService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy thông tin tệp media thành công')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(+id);
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateMediaSchema))
  update(@Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(+id, updateMediaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Xóa tệp media thành công')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(+id);
  }

  // Endpoint để phục vụ file (original, thumbnail, medium)
  // Ví dụ: GET /media/serve/original/abc.jpg, GET /media/serve/thumbnails/abc_thumb.webp
  @Get('serve/:type/:filename')
  @ResponseMessage('Xử lý tệp media')
  serveFile(
    @Param('type') type: 'original' | 'thumbnails' | 'medium',
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const rootUploadsDir = join(process.cwd(), 'uploads', 'media');
    let filePath: string;

    switch (type) {
      case 'original':
        filePath = join(rootUploadsDir, 'original', filename);
        break;
      case 'thumbnails':
        filePath = join(rootUploadsDir, 'thumbnails', filename);
        break;
      case 'medium':
        filePath = join(rootUploadsDir, 'medium', filename);
        break;
      default:
        throw new BadRequestException('Loại tệp không hợp lệ.');
    }

    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      throw new NotFoundException('Không tìm thấy tệp.');
    }
  }
}