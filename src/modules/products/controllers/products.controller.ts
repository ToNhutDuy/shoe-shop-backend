import {
    Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus, ParseIntPipe, UsePipes, BadRequestException, UseGuards,
    InternalServerErrorException, UseInterceptors, UploadedFile, Logger, Req, Patch
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from '../services/product.service';
import { MediaService } from '../../media/media.service';
import { Product } from '../entities/product.entity';
import { MediaPurpose } from '../../media/entities/media.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';
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
@Controller('products')
export class ProductController {
    private readonly logger = new Logger(ProductController.name);

    constructor(
        private readonly productService: ProductService,
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
            await this.productService.updateProductImage(productId, mediaRecord.id);
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


    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createProduct(@Body() createProductDto: any): Promise<Product> {
        this.logger.log('Received request to create product.');
        return this.productService.createProduct(createProductDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Public()
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    async findAllProducts(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Product & { minSellingPrice?: number }>> {
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
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: any): Promise<Product> {
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

    @Get('slug/:slug') // Endpoint mới
    @HttpCode(HttpStatus.OK)
    @Public() // Cho phép truy cập công khai
    async findProductBySlug(@Param('slug') slug: string): Promise<Product> {
        this.logger.log(`Received request to find product by slug: ${slug}`);
        return this.productService.findProductBySlug(slug);
    }
    @Get('by-category/:categorySlug/all') // Đường dẫn mới để rõ ràng hơn: /products/by-category/:categorySlug/all
    @HttpCode(HttpStatus.OK)
    @Public() // Cho phép truy cập công khai
    async findAllProductsByCategorySlug(
        @Param('categorySlug') categorySlug: string,
    ): Promise<(Product & { minSellingPrice?: number })[]> { // Trả về một mảng Product
        this.logger.log(`Received request to find all products by category slug: ${categorySlug}`);
        return this.productService.findAllProductsByCategorySlug(categorySlug);
    }
}