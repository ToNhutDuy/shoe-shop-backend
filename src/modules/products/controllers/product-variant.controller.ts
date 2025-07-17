// src/modules/product/controllers/product-variant.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    UsePipes,
    UseGuards,
    Logger,
    UseInterceptors,
    UploadedFile,
    Req,
    BadRequestException,
    InternalServerErrorException
} from '@nestjs/common';

import {
    CreateProductVariantDto,
    UpdateProductVariantDto,
    AddVariantAttributeValueDto,
    CreateProductVariantSchema,
    UpdateProductVariantSchema,
    AddVariantAttributeValueSchema,
} from '../schemas/product.schema';

import { ProductVariantService } from '../services/product-variant.service';

import { ProductVariant } from '../entities/product-variant.entity';
import { ProductVariantAttributeValue } from '../entities/product-variant-attribute-value.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaPurpose } from 'src/modules/media/entities/media.entity';
import { MediaService } from 'src/modules/media/media.service';
import { Public } from 'src/common/decorators/public.decorator';

interface AuthenticatedUser {
    userId: number;
    email: string;
    roles: string[];
}

interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products/:productId/variants')
export class ProductVariantController {
    private readonly logger = new Logger(ProductVariantController.name);

    constructor(
        private readonly productVariantService: ProductVariantService,
        private readonly mediaService: MediaService,
    ) { }

    @Put(':variantId/image')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProductVariantImage(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest,
    ) {
        if (!file) {
            throw new BadRequestException('Không có file nào được tải lên.');
        }

        try {
            const subfolder = `product-variants/${variantId}/image`;
            const userId = req.user.userId;
            const purpose = MediaPurpose.PRODUCT_VARIANT_IMAGE;

            const mediaRecord = await this.mediaService.uploadFile(file, subfolder, userId, undefined, purpose);

            await this.productVariantService.updateImageVariant(variantId, mediaRecord.id);

            return {
                message: 'Ảnh biến thể đã được tải lên và cập nhật thành công.',
                mediaId: mediaRecord.id,
                imageUrl: mediaRecord.full_url,
                thumbnailUrl: mediaRecord.thumbnail_url,
                mediumUrl: mediaRecord.medium_url,
                altText: mediaRecord.default_alt_text,
            };
        } catch (error: any) {
            this.logger.error(`Lỗi khi tải lên ảnh cho biến thể ${variantId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Không thể tải lên ảnh biến thể sản phẩm.');
        }
    }
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createProductVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Body() createProductVariantDto: CreateProductVariantDto,
    ): Promise<ProductVariant> {
        this.logger.log(`Received request to create product variant for product ID: ${productId}`);
        return this.productVariantService.createProductVariant(productId, createProductVariantDto);
    }

    @Get('/')
    @HttpCode(HttpStatus.OK)
    @Public()
    async findAllProductVariants(
        @Param('productId', ParseIntPipe) productId: number,
        @Query() query: PaginationQueryDto,
    ): Promise<PaginatedResponse<ProductVariant>> {
        this.logger.log(`Received request to find all product variants for product ID: ${productId}`);
        return this.productVariantService.findAllProductVariants(productId, query);
    }

    @Get(':variantId')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findProductVariantById(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
    ): Promise<ProductVariant> {
        return this.productVariantService.findProductVariantById(variantId);
    }

    @Put(':variantId')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProductVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
        @Body() updateProductVariantDto: UpdateProductVariantDto,
    ): Promise<ProductVariant> {
        return this.productVariantService.updateProductVariant(variantId, updateProductVariantDto);
    }


    @Delete(':variantId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteProductVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
    ): Promise<void> {
        await this.productVariantService.deleteProductVariant(variantId);
    }


    @Post(':variantId/attribute-values')
    @HttpCode(HttpStatus.CREATED)
    @Permissions([{ resource: Resource.products, action: [Action.create, Action.update] }])
    async addAttributeValueToVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
        @Body() addVariantAttributeValueDto: AddVariantAttributeValueDto,
    ): Promise<ProductVariantAttributeValue[]> {
        return this.productVariantService.addOrUpdateVariantAttributeValue(variantId, addVariantAttributeValueDto);
    }

    @Get(':variantId/attribute-values')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async getAttributeValuesForVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
    ): Promise<ProductVariantAttributeValue[]> {
        return this.productVariantService.findAttributeValuesByVariantId(variantId);
    }

    @Delete(':variantId/attribute-values/:attributeValueId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async removeAttributeValueFromVariant(
        @Param('productId', ParseIntPipe) productId: number,
        @Param('variantId', ParseIntPipe) variantId: number,
        @Param('attributeValueId', ParseIntPipe) attributeValueId: number,
    ): Promise<void> {
        await this.productVariantService.removeVariantAttributeValue(variantId, attributeValueId);
    }
}