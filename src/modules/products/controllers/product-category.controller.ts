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
    Logger
} from '@nestjs/common';

import {
    CreateProductCategoryDto,
    UpdateProductCategoryDto,
    CreateProductCategorySchema,
    UpdateProductCategorySchema,
} from '../schemas/product.schema';

import { ProductCategoryService } from '../services/product-category.service';
import { ProductCategory } from '../entities/product-category.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class ProductCategoryController {
    private readonly logger = new Logger(ProductCategoryController.name);

    constructor(
        private readonly productCategoryService: ProductCategoryService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(CreateProductCategorySchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createCategory(@Body() createCategoryDto: CreateProductCategoryDto): Promise<ProductCategory> {
        this.logger.log('Received request to create product category.');
        return this.productCategoryService.createCategory(createCategoryDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllCategories(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<ProductCategory>> {
        this.logger.log('Received request to find all product categories.');
        return this.productCategoryService.findAllCategories(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findCategoryById(@Param('id', ParseIntPipe) id: number): Promise<ProductCategory> {
        this.logger.log(`Received request to find product category by ID: ${id}`);
        return this.productCategoryService.findCategoryById(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: any): Promise<ProductCategory> {
        this.logger.log(`Received request to update product category ID: ${id}`);
        return this.productCategoryService.updateCategory(id, updateCategoryDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Received request to delete product category ID: ${id}`);
        await this.productCategoryService.deleteCategory(id);
    }
}