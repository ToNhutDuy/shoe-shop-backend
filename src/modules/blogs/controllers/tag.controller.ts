// src/blog/controllers/tag.controller.ts
import {
    Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus,
    NotFoundException, HttpCode, ParseIntPipe,
    UsePipes, Logger, UseGuards, BadRequestException
} from '@nestjs/common';
import { TagService } from '../services/tag.service';
import { CreateTagZodDto, UpdateTagZodDto, createTagSchema, updateTagSchema } from '../dto/tag.zod';
import { Tag } from '../entities/tag.entity';
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
    { resource: Resource.tags, action: [Action.read, Action.create, Action.update, Action.delete] },
])
@Controller('tags')
export class TagController {
    private readonly logger = new Logger(TagController.name);

    constructor(private readonly tagService: TagService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(createTagSchema))
    @ResponseMessage('Tạo thẻ thành công')
    @Permissions([{ resource: Resource.tags, action: [Action.create] }])
    async create(@Body() createTagDto: CreateTagZodDto): Promise<Tag> {
        this.logger.log(`Đang tạo thẻ mới: ${createTagDto.title}`);
        return this.tagService.createTag(createTagDto);
    }


    @Get()
    @Public()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @ResponseMessage('Lấy danh sách thẻ thành công')
    async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Tag>> {
        this.logger.log(`Đang lấy danh sách thẻ với query: ${JSON.stringify(query)}`);
        const { current, pageSize, search, sort } = query;
        const result = await this.tagService.findAllTags(current, pageSize, search, sort);
        if (!result.data.length && search) {
            throw new NotFoundException('Không tìm thấy thẻ nào khớp với tìm kiếm của bạn.');
        }
        return result;
    }


    @Get(':identifier')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Lấy thông tin thẻ thành công')
    async findOne(@Param('identifier') identifier: string | number): Promise<Tag> {
        const parsedIdentifier = isNaN(Number(identifier)) ? identifier.toString() : parseInt(identifier as string, 10);
        this.logger.log(`Đang lấy thông tin thẻ với Identifier: ${parsedIdentifier}`);
        return this.tagService.findOneTag(parsedIdentifier);
    }


    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(updateTagSchema))
    @ResponseMessage('Cập nhật thẻ thành công')
    @Permissions([{ resource: Resource.tags, action: [Action.update] }])
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTagDto: UpdateTagZodDto,
    ): Promise<Tag> {
        this.logger.log(`Đang cập nhật thẻ ID: ${id}. Dữ liệu: ${JSON.stringify(updateTagDto)}`);
        return this.tagService.updateTag(id, updateTagDto);
    }


    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ResponseMessage('Xóa thẻ thành công')
    @Permissions([{ resource: Resource.tags, action: [Action.delete] }])
    async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Đang xóa thẻ với ID: ${id}`);
        await this.tagService.deleteTag(id);
    }
}
