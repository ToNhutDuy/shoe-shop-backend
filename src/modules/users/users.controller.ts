import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
  NotFoundException, HttpCode, Put, ParseIntPipe,
  UsePipes, Logger,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UsersService } from './users.service';

import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';

import { MediaService } from '../media/media.service';
import { ALLOWED_IMAGE_MIMETYPES, MAX_IMAGE_SIZE_BYTES } from '../media/constants/media-mimetypes.constant';
import { storageConfig } from 'src/config/storage.config';
import { Resource } from '../roles/enums/resource.enum';
import { Action } from '../roles/enums/action.enum';

import { createUserSchema, CreateUserZodDto, updateUserSchema, UpdateUserZodDto } from './dto/user-zod.dto';
import { createAddressSchema, CreateAddressZodDto, updateAddressSchema, UpdateAddressZodDto } from './dto/address-zod.dto';
import { UsersResponseDto } from './dto/user-response.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import { User } from 'src/common/decorators/user.decorator';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';


@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
  { resource: Resource.users, action: [Action.read, Action.create, Action.update, Action.delete] },
  { resource: Resource.roles, action: [Action.create, Action.delete, Action.read, Action.update] }
])
@Controller('users')
export class UsersController {

  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService
  ) { }

  @Patch(':id')
  @ResponseMessage('Cập nhật người dùng thành công')
  @Permissions([{ resource: Resource.users, action: [Action.update] }])
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserData: any) {

    const user = await this.usersService.update(id, updateUserData);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id} để cập nhật hoặc có lỗi xảy ra.`);
    }
    return user;
  }

  @Delete('addresses/delete/:id')
  @ResponseMessage('Xóa địa chỉ thành công')
  @HttpCode(HttpStatus.OK)
  async deleteAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @User('userId') userId: number,
  ): Promise<{ message: string }> {
    this.logger.log(`Người dùng ID ${userId} đang cố gắng xóa địa chỉ ID: ${addressId}`);

    await this.usersService.deleteAddress(addressId, userId);
    return { message: `Địa chỉ với ID ${addressId} đã được xóa thành công.` };
  }

  @Put('upload-avatar')
  @ResponseMessage('Tải lên ảnh đại diện thành công')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: storageConfig('avatar'),
    limits: {
      fileSize: MAX_IMAGE_SIZE_BYTES,
    },
    fileFilter: (req, file, callback) => {
      if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Loại file "${file.mimetype}" không được phép. Chỉ chấp nhận các loại ảnh: ${ALLOWED_IMAGE_MIMETYPES.join(', ')}`,
          ),
          false,
        );
      }
      callback(null, true);
    },
  }))
  async uploadProfile(
    @User('userId') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file ảnh đại diện nào được tải lên.');
    }
    const relativeAvatarPath = `avatar/${file.filename}`.replace(/\\/g, '/');
    this.logger.log(`Người dùng ID ${userId} đang tải lên ảnh đại diện: ${relativeAvatarPath}`);
    return await this.usersService.updateProfile(userId, relativeAvatarPath);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createUserSchema))
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo người dùng thành công')
  @Permissions([{ resource: Resource.users, action: [Action.create] }])
  async create(@Body() data: CreateUserZodDto) {
    this.logger.log(`Đang cố gắng tạo người dùng mới với email: ${data.email}`);
    const user = await this.usersService.create(data);
    if (!user) {
      throw new BadRequestException('Không thể tạo người dùng. Có thể email đã tồn tại hoặc dữ liệu không hợp lệ.');
    }
    return user;
  }

  @Get('addresses')
  @ResponseMessage('Lấy danh sách địa chỉ người dùng thành công')
  @Permissions([{ resource: Resource.users, action: [Action.read] }])
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  async findAllAddress(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<AddressResponseDto>> {
    this.logger.log(`Admin đang lấy tất cả địa chỉ với query: "${query.search || 'none'}", page: ${query.current}, limit: ${query.pageSize}, sort: "${query.sort || 'none'}"`);
    const result = await this.usersService.findAllAddress(query.search, query.current, query.pageSize, query.sort);
    return result;
  }

  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  @Permissions([{ resource: Resource.users, action: [Action.read] }])
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<UsersResponseDto>> {
    this.logger.log(`Admin đang lấy tất cả người dùng với query: "${query.search || 'none'}", page: ${query.current}, limit: ${query.pageSize}, sort: "${query.sort || 'none'}"`);
    const result = await this.usersService.findAllUsers(query.search, query.current, query.pageSize, query.sort);

    if (!result.data.length && query.search) {
      throw new NotFoundException('Không tìm thấy người dùng nào khớp với tìm kiếm của bạn.');
    }
    return result;
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  @Permissions([{ resource: Resource.users, action: [Action.read] }])
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Admin đang lấy thông tin người dùng với ID: ${id}`);
    const user = await this.usersService.findOneUserById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}.`);
    }
    return user;
  }


  @Delete(':id')
  @Roles('admin')
  @Permissions([{ resource: Resource.users, action: [Action.delete] }])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Xóa người dùng thành công')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    this.logger.log(`Admin đang cố gắng xóa người dùng với ID: ${id}`);
    await this.usersService.remove(id);
    return { message: `Người dùng với ID ${id} đã được xóa thành công.` };
  }

  @Get('me/addresses')
  @ResponseMessage('Lấy danh sách địa chỉ thành công')
  async getAddresses(
    @User('userId') userId: number,
  ): Promise<AddressResponseDto[]> {
    this.logger.log(`Đang lấy danh sách địa chỉ cho người dùng ID: ${userId}`);
    return this.usersService.getAddressesByUserId(userId);
  }

  @Post('addresses')
  @ResponseMessage('Thêm địa chỉ mới thành công')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createAddressSchema))
  async createAddress(
    @User('userId') userId: number,
    @Body() createAddressData: CreateAddressZodDto,
  ): Promise<AddressResponseDto> {
    this.logger.log(`Người dùng ID ${userId} đang tạo địa chỉ mới.`);
    return this.usersService.createAddress(userId, createAddressData);
  }

  @Put('me/addresses/:addressId')
  @ResponseMessage('Cập nhật địa chỉ thành công')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateAddressSchema))
  async updateAddress(
    @Param('addressId', ParseIntPipe) addressId: number,
    @User('userId') userId: number,
    @Body() updateAddressData: UpdateAddressZodDto,
  ): Promise<AddressResponseDto> {
    this.logger.log(`Người dùng ID ${userId} đang cập nhật địa chỉ ID: ${addressId}`);
    return this.usersService.updateAddress(addressId, userId, updateAddressData);
  }
}
