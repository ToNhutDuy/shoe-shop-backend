// src/promotion/controllers/promotion.controller.ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
  NotFoundException, HttpCode, Put, ParseIntPipe,
  UsePipes, Logger, UseGuards, BadRequestException
} from '@nestjs/common';
import { PromotionService } from '../services/promotion.service';
import { Promotion } from '../entities/promotion.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from 'src/modules/roles/enums/resource.enum';
import { Action } from 'src/modules/roles/enums/action.enum';
import { ResponseMessage } from 'src/common/decorators/public.decorator';
import { createPromotionSchema, CreatePromotionZodDto, updatePromotionSchema, UpdatePromotionZodDto } from '../dto/promotion.zod';


@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
  { resource: Resource.promotions, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('promotions')
export class PromotionController {
  private readonly logger = new Logger(PromotionController.name);

  constructor(private readonly promotionService: PromotionService) { }


  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createPromotionSchema))
  @ResponseMessage('Tạo mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.create] }])
  async create(@Body() createPromotionDto: CreatePromotionZodDto): Promise<Promotion> {
    this.logger.log(`Đang tạo mã giảm giá mới: ${createPromotionDto.code}`);
    return this.promotionService.createPromotion(createPromotionDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  @ResponseMessage('Lấy danh sách mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.read] }])
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Promotion>> {
    this.logger.log(`Đang lấy danh sách mã giảm giá với query: ${JSON.stringify(query)}`);
    const { current, pageSize, search, sort } = query;
    const result = await this.promotionService.findAllPromotions(current, pageSize, search, sort);
    if (!result.data.length && search) {
      throw new NotFoundException('Không tìm thấy mã giảm giá nào khớp với tìm kiếm của bạn.');
    }
    return result;
  }


  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy thông tin mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.read] }])
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Promotion> {
    this.logger.log(`Đang lấy thông tin mã giảm giá với ID: ${id}`);
    return this.promotionService.findOnePromotion(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updatePromotionSchema))
  @ResponseMessage('Cập nhật mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.update] }])
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionZodDto,
  ): Promise<Promotion> {
    this.logger.log(`Đang cập nhật mã giảm giá ID: ${id}. Dữ liệu: ${JSON.stringify(updatePromotionDto)}`);
    return this.promotionService.updatePromotion(id, updatePromotionDto);
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Xóa mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.delete] }])
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    this.logger.log(`Đang xóa mã giảm giá với ID: ${id}`);
    await this.promotionService.deletePromotion(id);
  }


  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cập nhật trạng thái mã giảm giá thành công')
  @Permissions([{ resource: Resource.promotions, action: [Action.update] }])
  async toggleActiveStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ): Promise<Promotion> {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('Trạng thái hoạt động phải là giá trị boolean.');
    }
    this.logger.log(`Đang cập nhật trạng thái mã giảm giá ID ${id} thành ${isActive}.`);
    return this.promotionService.togglePromotionActiveStatus(id, isActive);
  }
}
