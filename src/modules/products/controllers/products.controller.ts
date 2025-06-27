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
    BadRequestException,
    UseGuards,
    InternalServerErrorException,
    UseInterceptors,
    UploadedFile,
    Logger,
    Req,
    Patch
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

import {
    CreateProductDto,
    UpdateProductDto,
    AddGalleryImagesToProductDto,
    UpdateProductGalleryMediaDto,
    CreateProductSchema,
    UpdateProductSchema,
    AddGalleryImagesToProductSchema,
    UpdateProductGalleryMediaSchema,
} from '../schemas/product.schema';

import { ProductService } from '../services/product.service';
import { ProductGalleryMediaService } from '../services/product-gallery-media.service';
import { MediaService } from '../../media/media.service';

import { Product } from '../entities/product.entity';
import { ProductGalleryMedia } from '../entities/product-gallery-media.entity';
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
@Controller('products')
export class ProductController {
    private readonly logger = new Logger(ProductController.name);

    constructor(
        private readonly productService: ProductService,
        private readonly productGalleryMediaService: ProductGalleryMediaService,
        private readonly mediaService: MediaService,
    ) { }

    @Put(':productId/main-image')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async uploadProductMainImage(
        @Param('productId', ParseIntPipe) productId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest,
    ) {
        if (!file) {
            throw new BadRequestException('Không có file nào được tải lên.');
        }

        try {
            const subfolder = `products/${productId}/main`;
            const userId = req.user.userId;
            const purpose = MediaPurpose.PRODUCT_IMAGE;

            const mediaRecord = await this.mediaService.uploadFile(file, subfolder, userId, undefined, purpose);

            this.logger.log(`Uploaded main image for product ${productId}. Media ID: ${mediaRecord.id}`);
            return {
                message: 'Ảnh chính của sản phẩm đã được tải lên thành công',
                mediaId: mediaRecord.id,
                imageUrl: mediaRecord.full_url,
                thumbnailUrl: mediaRecord.thumbnail_url,
                mediumUrl: mediaRecord.medium_url,
                altText: mediaRecord.default_alt_text,
            };
        } catch (error: any) {
            this.logger.error(`Lỗi khi tải lên ảnh chính cho sản phẩm ${productId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Không thể tải lên ảnh chính của sản phẩm.');
        }
    }

    @Put(':productId/gallery-image')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async uploadProductGalleryImage(
        @Param('productId', ParseIntPipe) productId: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: AuthenticatedRequest,
    ) {
        if (!file) {
            throw new BadRequestException('Không có file nào được tải lên.');
        }

        try {
            const subfolder = `products/${productId}/gallery`;
            const userId = req.user.userId;
            const purpose = MediaPurpose.PRODUCT_IMAGE;

            const mediaRecord = await this.mediaService.uploadFile(file, subfolder, userId, undefined, purpose);

            this.logger.log(`Uploaded gallery image for product ${productId}. Media ID: ${mediaRecord.id}`);
            return {
                message: 'Ảnh gallery của sản phẩm đã được tải lên thành công',
                mediaId: mediaRecord.id,
                imageUrl: mediaRecord.full_url,
                thumbnailUrl: mediaRecord.thumbnail_url,
                mediumUrl: mediaRecord.medium_url,
                altText: mediaRecord.default_alt_text,
            };
        } catch (error: any) {
            this.logger.error(`Lỗi khi tải lên ảnh gallery cho sản phẩm ${productId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Không thể tải lên ảnh gallery của sản phẩm.');
        }
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(CreateProductSchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createProduct(@Body() createProductDto: CreateProductDto): Promise<Product> {
        this.logger.log('Received request to create product.');
        return this.productService.createProduct(createProductDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllProducts(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Product>> {
        this.logger.log('Received request to find all products.');
        return this.productService.findAllProducts(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findProductById(@Param('id', ParseIntPipe) id: number): Promise<Product> {
        this.logger.log(`Received request to find product by ID: ${id}`);
        return this.productService.findProductById(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(UpdateProductSchema))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
        this.logger.log(`Received request to update product ID: ${id}`);
        return this.productService.updateProduct(id, updateProductDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteProduct(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Received request to delete product ID: ${id}`);
        await this.productService.deleteProduct(id);
    }


    @Post(':productId/gallery-images')
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(AddGalleryImagesToProductSchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async addProductImages(
        @Param('productId', ParseIntPipe) productId: number,
        @Body() galleryImagesDto: AddGalleryImagesToProductDto,
    ): Promise<ProductGalleryMedia[]> {
        return this.productGalleryMediaService.addImagesToProductGallery(productId, galleryImagesDto);
    }

    @Get(':productId/gallery-images')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async getProductImages(
        @Param('productId', ParseIntPipe) productId: number,
        @Query() query: PaginationQueryDto,
    ): Promise<PaginatedResponse<ProductGalleryMedia>> {
        return this.productGalleryMediaService.findProductImagesByProductId(productId, query);
    }


    @Put(':productId/gallery-images/reorder')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async reorderProductImages(
        @Param('productId', ParseIntPipe) productId: number,
        @Body() orderUpdates: { id: number; displayOrder: number }[],
    ): Promise<ProductGalleryMedia[]> {
        return this.productGalleryMediaService.reorderProductImages(productId, orderUpdates);
    }
}