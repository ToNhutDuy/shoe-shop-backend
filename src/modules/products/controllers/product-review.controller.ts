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
    Logger
} from '@nestjs/common';

import {
    CreateProductReviewDto,
    UpdateProductReviewDto,
    CreateProductReviewSchema,
    UpdateProductReviewSchema,
} from '../schemas/product.schema';

import { ProductService } from '../services/product.service';

import { ProductReview } from '../entities/product-review.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ProductReviewController {
    private readonly logger = new Logger(ProductReviewController.name);

    constructor(
        private readonly productService: ProductService,
    ) { }

    @Post(':productId')
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(CreateProductReviewSchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createProductReview(@Param('productId', ParseIntPipe) productId: number, @Body() createReviewDto: CreateProductReviewDto): Promise<ProductReview> {
        if (productId !== createReviewDto.productId) {
            throw new BadRequestException('ID sản phẩm trong đường dẫn phải khớp với ID sản phẩm trong body.');
        }
        return this.productService.createProductReview(createReviewDto);
    }

    @Get('product/:productId')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllProductReviews(
        @Param('productId', ParseIntPipe) productId: number,
        @Query() query: PaginationQueryDto,
    ): Promise<PaginatedResponse<ProductReview>> {
        return this.productService.findAllProductReviews(query, productId);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findProductReviewById(@Param('id', ParseIntPipe) id: number): Promise<ProductReview> {
        return this.productService.findProductReviewById(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(UpdateProductReviewSchema))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProductReview(@Param('id', ParseIntPipe) id: number, @Body() updateReviewDto: UpdateProductReviewDto): Promise<ProductReview> {
        return this.productService.updateProductReview(id, updateReviewDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteProductReview(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.productService.deleteProductReview(id);
    }
}