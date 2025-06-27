// src/banner/banner.controller.ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  HttpCode, HttpStatus, UsePipes, Logger, Put,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { CreateBannerZodDto, UpdateBannerZodDto, BannerQueryZodDto } from './dto/banner-zod.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { Roles } from 'src/common/decorators/roles.decorator'; // Nếu bạn muốn áp dụng Roles Guard
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from 'src/modules/roles/enums/resource.enum';
import { Action } from 'src/modules/roles/enums/action.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { createBannerSchema, updateBannerSchema, bannerQuerySchema } from './dto/banner-zod.dto';
import { BannerService } from './banners.service';
import { Banner } from './entities/banner.entity';

// Áp dụng các Guard và Permissions mặc định cho controller (quản lý bởi admin)
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
  { resource: Resource.banners, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('banners')
export class BannerController {
  private readonly logger = new Logger(BannerController.name);

  constructor(private readonly bannerService: BannerService) { }

  /**
   * Tạo một banner mới.
   * - Yêu cầu quyền 'create' trên tài nguyên 'banners'.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo banner thành công')
  @UsePipes(new ZodValidationPipe(createBannerSchema))
  @Permissions([{ resource: Resource.banners, action: [Action.create] }])
  async create(@Body() createBannerDto: CreateBannerZodDto): Promise<Banner> {
    this.logger.log(`Đang tạo banner mới: ${createBannerDto.title}`);
    return this.bannerService.create(createBannerDto);
  }

  /**
   * Lấy danh sách tất cả các banner (dành cho Admin).
   * - Hỗ trợ phân trang, tìm kiếm, lọc theo positionKey, bannerType, isActive.
   * - Yêu cầu quyền 'read' trên tài nguyên 'banners'.
   */
  @Get()
  @ResponseMessage('Lấy danh sách banner thành công')
  @UsePipes(new ZodValidationPipe(bannerQuerySchema)) // Áp dụng ZodValidationPipe cho query params
  @Permissions([{ resource: Resource.banners, action: [Action.read] }])
  async findAll(@Query() query: BannerQueryZodDto): Promise<PaginatedResponse<Banner>> {
    this.logger.log(`Đang lấy danh sách banner với query: ${JSON.stringify(query)}`);
    return this.bannerService.findAll(query);
  }

  /**
   * Lấy thông tin chi tiết của một banner theo ID (dành cho Admin).
   * - Yêu cầu quyền 'read' trên tài nguyên 'banners'.
   */
  @Get(':id')
  @ResponseMessage('Lấy thông tin banner thành công')
  @Permissions([{ resource: Resource.banners, action: [Action.read] }])
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Banner> {
    this.logger.log(`Đang lấy thông tin banner ID: ${id}`);
    return this.bannerService.findOne(id);
  }

  /**
   * Cập nhật thông tin của một banner theo ID.
   * - Yêu cầu quyền 'update' trên tài nguyên 'banners'.
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cập nhật banner thành công')
  @UsePipes(new ZodValidationPipe(updateBannerSchema))
  @Permissions([{ resource: Resource.banners, action: [Action.update] }])
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateBannerDto: UpdateBannerZodDto): Promise<Banner> {
    this.logger.log(`Đang cập nhật banner ID: ${id}`);
    return this.bannerService.update(id, updateBannerDto);
  }

  /**
   * Xóa một banner theo ID.
   * - Yêu cầu quyền 'delete' trên tài nguyên 'banners'.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK) // Trả về 200 OK để có thể gửi message
  @ResponseMessage('Xóa banner thành công')
  @Permissions([{ resource: Resource.banners, action: [Action.delete] }])
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    this.logger.log(`Đang xóa banner ID: ${id}`);
    await this.bannerService.remove(id);
    return { message: `Banner với ID ${id} đã được xóa thành công.` };
  }

  // --- API Công khai cho Frontend ---

  /**
   * Lấy danh sách banner đang hoạt động theo vị trí (position_key).
   * - Không yêu cầu xác thực (@Public).
   * - Thường dùng cho frontend để hiển thị banner trên trang chủ, sidebar, v.v.
   */
  @Get('public/position/:positionKey')
  @Public() // Đánh dấu là endpoint công khai
  @ResponseMessage('Lấy banner công khai theo vị trí thành công')
  async getPublicBannersByPosition(@Param('positionKey') positionKey: string): Promise<Banner[]> {
    this.logger.log(`Đang lấy banner công khai cho vị trí: ${positionKey}`);
    return this.bannerService.getActiveBannersByPosition(positionKey);
  }
}