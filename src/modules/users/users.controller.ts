import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
  NotFoundException, HttpCode, Req, UseGuards, Put, ParseIntPipe,
  UsePipes, Logger,
  BadRequestException,
  UploadedFile,
  UseInterceptors, // Added Logger
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';

import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { createUserSchema, CreateUserZodDto, updateUserSchema, UpdateUserZodDto } from './dto/user-zod.dto';
import { createAddressSchema, CreateAddressZodDto, updateAddressSchema, UpdateAddressZodDto } from './dto/address-zod.dto';
import { Request } from 'express'; // For typing req.user
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from '../roles/enums/resource.enum';
import { Action } from '../roles/enums/action.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { MediaService } from '../media/media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ALLOWED_IMAGE_MIMETYPES, MAX_FILE_SIZE_BYTES } from '../media/constants/media-mimetypes.constant';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';


interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}


@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([{ resource: Resource.users, action: [Action.read, Action.create, Action.update, Action.delete] },
{ resource: Resource.roles, action: [Action.create, Action.delete, Action.read, Action.update] }])
@Controller('users')
export class UsersController {

  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService,
    private readonly mediaService: MediaService
  ) { }

  // Quản lý Người dùng
  @Post()

  @UsePipes(new ZodValidationPipe(createUserSchema))
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo người dùng thành công')
  async create(@Body() data: CreateUserZodDto) {
    const user = await this.usersService.create(data);
    if (!user) {
      throw new BadRequestException('Không thể tạo người dùng');
    }
    return user;
  }
  @Get('addresses')
  @ResponseMessage('Lấy danh sách địa chỉ người dùng thành công')
  async findAllAddress(
    @Query('query') query?: string,
    @Query('current', new ParseIntPipe({ optional: true })) current?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('sort') sort?: string,
  ) {

    return this.usersService.findAllAddress(query, current, pageSize, sort);
  }

  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async findAll(
    @Query('query') query?: string, // query là chuỗi tìm kiếm, có thể là tên, email, số điện thoại, v.v.
    // current và pageSize là các tham số phân trang, nếu không có thì sẽ là undefined
    @Query('current', new ParseIntPipe({ optional: true })) current?: number, // Dùng ParseIntPipe để tự động chuyển đổi và kiểm tra kiểu dữ liệu
    // current và pageSize đều là số nguyên, nếu không có thì sẽ là undefined
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('sort') sort?: string,
  ) {
    const usersPagination = await this.usersService.findAll(query, current, pageSize, sort);
    if (!usersPagination) {
      throw new NotFoundException('Không tìm thấy người dùng nào');
    }
    return usersPagination;
  }

  @Patch('profile-picture')
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
        if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
          return cb(new BadRequestException(`Only image files are allowed for profile pictures!`), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES, // Áp dụng giới hạn chung
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadProfilePicture(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Không có tệp nào được tải lên');
    }

    const authenticatedUserId = req.user.userId;

    const mediaRecord = await this.mediaService.createMediaRecord(file, { uploaded_by_user_id: authenticatedUserId });
    if (!mediaRecord) {
      throw new BadRequestException('Không thể tạo bản ghi media cho ảnh đại diện');
    }
    const user = await this.usersService.update(authenticatedUserId, { profilePictureMediaId: mediaRecord.id });


    return {
      message: 'Cập nhật ảnh đại diện thành công',
      user: user,
      profilePictureUrl: this.mediaService.getPublicUrl(mediaRecord, 'thumbnail'),
    };
  }


  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);

    return user;
  }

  @Patch(':id')
  // @UseGuards(RolesGuard)
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  @ResponseMessage('Cập nhật người dùng thành công')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserData: UpdateUserZodDto) {
    const user = await this.usersService.update(id, updateUserData);
    // Service method update now throws NotFoundException if not found, so no need to check here.
    return user;
  }

  @Delete(':id')
  // @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT) // Correct for successful deletion with no body response
  @ResponseMessage('Xóa người dùng thành công') // This message might not be sent with 204
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
    // No return body for NO_CONTENT. Service's remove method will throw if user not found.
  }

  // Quản lý Địa chỉ Giao hàng
  // These routes are protected by the class-level JwtAuthGuard

  // @Get('addresses')
  // @ResponseMessage('Lấy danh sách địa chỉ thành công')
  // async getAddresses(@Req() req: AuthenticatedRequest) {
  //   return this.usersService.getAddressesByUserId(req.user.userId);
  // }

  @Post('addresses')
  @ResponseMessage('Thêm địa chỉ mới thành công')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createAddressSchema))
  async createAddress(@Req() req: AuthenticatedRequest, @Body() createAddressData: CreateAddressZodDto) {
    return this.usersService.createAddress(req.user.userId, createAddressData);
  }

  // @Get('addresses')
  // @ResponseMessage('Lấy chi tiết địa chỉ thành công')
  // async getAddress(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) addressId: number) {
  //   return this.usersService.getAddressById(addressId, req.user.userId);
  // }



  @Put('addresses/:id')
  @ResponseMessage('Cập nhật địa chỉ thành công')
  @UsePipes(new ZodValidationPipe(updateAddressSchema))
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateAddressData: UpdateAddressZodDto,
  ) {
    return this.usersService.updateAddress(addressId, req.user.userId, updateAddressData);
  }

  @Delete('addresses/:id')
  @ResponseMessage('Xóa địa chỉ thành công') // This message might not be sent with 204
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) addressId: number) {
    await this.usersService.deleteAddress(addressId, req.user.userId);
    // No return body for NO_CONTENT
  }
}