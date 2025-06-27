// src/promotion/controllers/flash-sale.controller.ts
import {
    Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
    NotFoundException, HttpCode, Put, ParseIntPipe,
    UsePipes, Logger, UseGuards, BadRequestException
} from '@nestjs/common';
import { FlashSaleService } from '../services/flash-sale.service';
import { FlashSale } from '../entities/flash-sale.entity';
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
import { createFlashSaleSchema, CreateFlashSaleZodDto, updateFlashSaleSchema, UpdateFlashSaleZodDto } from '../dto/flash-sale.zod';



@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
    { resource: Resource.flashSales, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('flash-sales')
export class FlashSaleController {
    private readonly logger = new Logger(FlashSaleController.name);

    constructor(private readonly flashSaleService: FlashSaleService) { }
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(createFlashSaleSchema))
    @ResponseMessage('Tạo Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.create] }])
    async create(@Body() createFlashSaleDto: CreateFlashSaleZodDto): Promise<FlashSale> {
        this.logger.log(`Đang tạo Flash Sale mới: ${createFlashSaleDto.name}`);
        return this.flashSaleService.createFlashSale(createFlashSaleDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @ResponseMessage('Lấy danh sách Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.read] }])
    async findAll(@Query() query: PaginationQueryDto, @Query('isActive') isActive?: string): Promise<PaginatedResponse<FlashSale>> {
        const { current, pageSize, search, sort } = query;
        const filterIsActive = typeof isActive === 'string' ? (isActive.toLowerCase() === 'true') : undefined;

        this.logger.log(`Đang lấy danh sách Flash Sale với query: ${JSON.stringify(query)}, isActive: ${filterIsActive}`);
        const result = await this.flashSaleService.findAllFlashSales(current, pageSize, search, sort, filterIsActive);
        if (!result.data.length && search) {
            throw new NotFoundException('Không tìm thấy Flash Sale nào khớp với tìm kiếm của bạn.');
        }
        return result;
    }


    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Lấy thông tin Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.read] }])
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<FlashSale> {
        this.logger.log(`Đang lấy thông tin Flash Sale với ID: ${id}`);
        return this.flashSaleService.findOneFlashSale(id);
    }


    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(updateFlashSaleSchema))
    @ResponseMessage('Cập nhật Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.update] }])
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateFlashSaleDto: UpdateFlashSaleZodDto,
    ): Promise<FlashSale> {
        this.logger.log(`Đang cập nhật Flash Sale ID: ${id}. Dữ liệu: ${JSON.stringify(updateFlashSaleDto)}`);
        return this.flashSaleService.updateFlashSale(id, updateFlashSaleDto);
    }


    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ResponseMessage('Xóa Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.delete] }])
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Đang xóa Flash Sale với ID: ${id}`);
        await this.flashSaleService.deleteFlashSale(id);
    }


    @Put(':id/status')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Cập nhật trạng thái Flash Sale thành công')
    @Permissions([{ resource: Resource.flashSales, action: [Action.update] }])
    async toggleActiveStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('isActive') isActive: boolean,
    ): Promise<FlashSale> {
        if (typeof isActive !== 'boolean') {
            throw new BadRequestException('Trạng thái hoạt động phải là giá trị boolean.');
        }
        this.logger.log(`Đang cập nhật trạng thái Flash Sale ID ${id} thành ${isActive}.`);
        return this.flashSaleService.toggleFlashSaleActiveStatus(id, isActive);
    }
}
