import {
    Controller, Get, Post, Put, Delete, Param,
    Body, Query,
    HttpCode, HttpStatus,
    ParseIntPipe, UsePipes,
    BadRequestException, UseGuards, InternalServerErrorException,
    UseInterceptors, UploadedFile, Logger, Req, Patch
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

import {
    CreateBrandDto,
    UpdateBrandDto,
    CreateBrandSchema,
    UpdateBrandSchema,
} from '../schemas/product.schema';

import { BrandService } from '../services/brand.service';
import { MediaService } from '../../media/media.service';

import { Brand } from '../entities/brand.entity';
import { MediaPurpose } from '../../media/entities/media.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';

interface AuthenticatedUser {
    userId: number;
    email: string;
    roles: string[];
}

interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('brands') // Tiền tố mới: /api/v1/brands
export class BrandController {
    private readonly logger = new Logger(BrandController.name);

    constructor(
        private readonly brandService: BrandService,
        private readonly mediaService: MediaService,
    ) { }

    // Quản lý Upload Media cho Thương hiệu
    @Put(':brandId/logo')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    @Permissions([{ resource: Resource.products, action: [Action.update] }]) // Hoặc tạo Resource.brands riêng
    async uploadBrandLogo(
        @Param('brandId', ParseIntPipe) brandId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest,
    ) {
        if (!file) {
            throw new BadRequestException('Không có file nào được tải lên.');
        }

        try {
            const subfolder = `brands/${brandId}/logo`;
            const userId = req.user.userId;
            const purpose = MediaPurpose.LOGO;

            const mediaRecord = await this.mediaService.uploadFile(file, subfolder, userId, undefined, purpose);

            await this.brandService.updateBrandLogo(brandId, mediaRecord.id);

            this.logger.log(`Uploaded logo for brand ${brandId}. Media ID: ${mediaRecord.id}`);
            return {
                message: 'Logo thương hiệu đã được tải lên thành công',
                mediaId: mediaRecord.id,
                imageUrl: mediaRecord.full_url,
                thumbnailUrl: mediaRecord.thumbnail_url,
                mediumUrl: mediaRecord.medium_url,
                altText: mediaRecord.default_alt_text,
            };
        } catch (error: any) {
            this.logger.error(`Lỗi khi tải lên logo cho thương hiệu ${brandId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Không thể tải lên logo thương hiệu.');
        }
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(CreateBrandSchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createBrand(@Body() createBrandDto: CreateBrandDto): Promise<Brand> {
        this.logger.log('Received request to create brand.');
        return this.brandService.createBrand(createBrandDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllBrands(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Brand>> {
        this.logger.log(`Received request to find all brands with current: ${query.current}, pageSize: ${query.pageSize}, search: "${query.search || 'none'}", sort: "${query.sort || 'none'}"`);
        return this.brandService.findAllBrands(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findBrandById(@Param('id', ParseIntPipe) id: number): Promise<Brand> {
        this.logger.log(`Received request to find brand by ID: ${id}`);
        return this.brandService.findOneBrand(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateBrand(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBrandDto: any,
    ): Promise<Brand> {
        this.logger.log(`Received request to update brand ID: ${id}`);
        return this.brandService.updateBrand(id, updateBrandDto);
    }


    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteBrand(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Received request to delete brand ID: ${id}`);
        await this.brandService.deleteBrand(id);
    }
}