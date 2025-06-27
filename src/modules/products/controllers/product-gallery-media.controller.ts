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
    UpdateProductGalleryMediaDto,
    UpdateProductGalleryMediaSchema,
} from '../schemas/product.schema';

import { ProductGalleryMediaService } from '../services/product-gallery-media.service';

import { ProductGalleryMedia } from '../entities/product-gallery-media.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod'; // Có thể không cần nếu chỉ thao tác từng ảnh
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gallery-media')
export class ProductGalleryMediaController {
    private readonly logger = new Logger(ProductGalleryMediaController.name);

    constructor(
        private readonly productGalleryMediaService: ProductGalleryMediaService,
    ) { }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async getProductGalleryImageById(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<ProductGalleryMedia> {
        return this.productGalleryMediaService.findProductGalleryMediaById(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(UpdateProductGalleryMediaSchema))
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateProductGalleryImage(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateGalleryImageDto: UpdateProductGalleryMediaDto,
    ): Promise<ProductGalleryMedia> {
        return this.productGalleryMediaService.updateProductGalleryMedia(id, updateGalleryImageDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteProductGalleryImage(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<void> {
        await this.productGalleryMediaService.removeProductGalleryMedia(id);
    }
}