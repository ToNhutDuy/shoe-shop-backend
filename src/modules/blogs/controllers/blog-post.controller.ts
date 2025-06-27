// src/blog/controllers/blog-post.controller.ts
import {
    Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
    NotFoundException, HttpCode, ParseIntPipe,
    UsePipes, Logger, UseGuards, BadRequestException
} from '@nestjs/common';
import { BlogPostService } from '../services/blog-post.service';
import { CreateBlogPostZodDto, UpdateBlogPostZodDto, createBlogPostSchema, updateBlogPostSchema, BlogPostStatus } from '../dto/blog-post.zod';
import { BlogPost } from '../entities/blog-post.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from 'src/modules/roles/enums/resource.enum';
import { Action } from 'src/modules/roles/enums/action.enum';
import { ResponseMessage, Public } from 'src/common/decorators/public.decorator';
import { User } from 'src/common/decorators/user.decorator';



@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([
    { resource: Resource.blogs, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('blog-posts')
export class BlogPostController {
    private readonly logger = new Logger(BlogPostController.name);

    constructor(private readonly blogPostService: BlogPostService) { }


    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(createBlogPostSchema))
    @ResponseMessage('Tạo bài viết blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.create] }])
    async create(
        @Body() createBlogPostDto: CreateBlogPostZodDto,
        @User('userId') authorUserId: number,
    ): Promise<BlogPost> {
        this.logger.log(`Người dùng ID ${authorUserId} đang tạo bài viết blog mới: "${createBlogPostDto.title}"`);
        return this.blogPostService.createBlogPost(createBlogPostDto, authorUserId);
    }


    @Get()
    @Public()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @ResponseMessage('Lấy danh sách bài viết blog thành công')
    async findAll(
        @Query() query: PaginationQueryDto,
        @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
        @Query('status') status?: BlogPostStatus,
    ): Promise<PaginatedResponse<BlogPost>> {
        const { current, pageSize, search, sort } = query;
        this.logger.log(`Đang lấy danh sách bài viết blog với query: ${JSON.stringify(query)}, categoryId: ${categoryId}, status: ${status}`);
        const result = await this.blogPostService.findAllBlogPosts(current, pageSize, search, sort, categoryId, status);
        if (!result.data.length && search) {
            throw new NotFoundException('Không tìm thấy bài viết blog nào khớp với tìm kiếm của bạn.');
        }
        return result;
    }

    @Get(':identifier')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Lấy thông tin bài viết blog thành công')
    async findOne(@Param('identifier') identifier: string | number): Promise<BlogPost> {
        const parsedIdentifier = isNaN(Number(identifier)) ? identifier.toString() : parseInt(identifier as string, 10);
        this.logger.log(`Đang lấy thông tin bài viết blog với Identifier: ${parsedIdentifier}`);
        return this.blogPostService.findOneBlogPost(parsedIdentifier);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(updateBlogPostSchema))
    @ResponseMessage('Cập nhật bài viết blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.update] }])
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBlogPostDto: UpdateBlogPostZodDto,
    ): Promise<BlogPost> {
        this.logger.log(`Đang cập nhật bài viết blog ID: ${id}. Dữ liệu: ${JSON.stringify(updateBlogPostDto)}`);
        return this.blogPostService.updateBlogPost(id, updateBlogPostDto);
    }


    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ResponseMessage('Xóa bài viết blog thành công')
    @Permissions([{ resource: Resource.blogs, action: [Action.delete] }])
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Đang xóa bài viết blog với ID: ${id}`);
        await this.blogPostService.deleteBlogPost(id);
    }


    @Post(':id/views')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Lượt xem bài viết đã được cập nhật')
    async incrementViews(@Param('id', ParseIntPipe) id: number): Promise<BlogPost> {
        this.logger.log(`Tăng lượt xem cho bài viết blog ID: ${id}`);
        return this.blogPostService.incrementViewCount(id);
    }
}
