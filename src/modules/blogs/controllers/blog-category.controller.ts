// src/blog/controllers/blog-category.controller.ts
import {
    Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
    NotFoundException, HttpCode, ParseIntPipe,
    UsePipes, Logger, UseGuards, BadRequestException
} from '@nestjs/common';
import { BlogCategoryService } from '../services/blog-category.service';
import { CreateBlogCategoryZodDto, UpdateBlogCategoryZodDto, createBlogCategorySchema, updateBlogCategorySchema } from '../dto/blog-category.zod';
import { BlogCategory } from '../entities/blog-category.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from 'src/modules/roles/enums/resource.enum';
import { Action } from 'src/modules/roles/enums/action.enum';
import { ResponseMessage, Public } from 'src/common/decorators/public.decorator';


@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
    { resource: Resource.blogs, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('blog-categories')
export class BlogCategoryController {
    private readonly logger = new Logger(BlogCategoryController.name);

    constructor(private readonly blogCategoryService: BlogCategoryService) { }

    /**
     * Tạo một danh mục blog mới.
     * Yêu cầu quyền 'create' trên 'blogCategories'.
     * @param createBlogCategoryDto Dữ liệu để tạo danh mục.
     * @returns Đối tượng BlogCategory đã tạo.
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(createBlogCategorySchema))
    @ResponseMessage('Tạo danh mục blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.create] }])
    async create(@Body() createBlogCategoryDto: CreateBlogCategoryZodDto): Promise<BlogCategory> {
        this.logger.log(`Đang tạo danh mục blog mới: ${createBlogCategoryDto.name}`);
        return this.blogCategoryService.createCategory(createBlogCategoryDto);
    }


    @Get()
    @Public()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @ResponseMessage('Lấy danh sách danh mục blog thành công')
    async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<BlogCategory>> {
        this.logger.log(`Đang lấy danh sách danh mục blog với query: ${JSON.stringify(query)}`);
        const { current, pageSize, search, sort } = query;
        const result = await this.blogCategoryService.findAllCategories(current, pageSize, search, sort);
        if (!result.data.length && search) {
            throw new NotFoundException('Không tìm thấy danh mục blog nào khớp với tìm kiếm của bạn.');
        }
        return result;
    }

    @Get(':identifier')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Lấy thông tin danh mục blog thành công')
    async findOne(@Param('identifier') identifier: string | number): Promise<BlogCategory> {
        // Determine if identifier is number or string (slug)
        const parsedIdentifier = isNaN(Number(identifier)) ? identifier.toString() : parseInt(identifier as string, 10);
        this.logger.log(`Đang lấy thông tin danh mục blog với Identifier: ${parsedIdentifier}`);
        return this.blogCategoryService.findOneCategory(parsedIdentifier);
    }


    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(updateBlogCategorySchema))
    @ResponseMessage('Cập nhật danh mục blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.update] }])
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBlogCategoryDto: UpdateBlogCategoryZodDto,
    ): Promise<BlogCategory> {
        this.logger.log(`Đang cập nhật danh mục blog ID: ${id}. Dữ liệu: ${JSON.stringify(updateBlogCategoryDto)}`);
        return this.blogCategoryService.updateCategory(id, updateBlogCategoryDto);
    }


    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ResponseMessage('Xóa danh mục blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.delete] }])
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Đang xóa danh mục blog với ID: ${id}`);
        await this.blogCategoryService.deleteCategory(id);
    }
}
