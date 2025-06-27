import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CmsService } from './cms.service';

import { CmsPage } from './entities/cms-page.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { Public } from 'src/common/decorators/public.decorator'; // Assuming you have a Public decorator
import { CmsPageQueryZodDto, CreateCmsPageZodDto, UpdateCmsPageZodDto } from './dto/create-cms-page.dto';

@Controller('cms-pages') // Base route for CMS pages
export class CmsController {
  constructor(private readonly cmsService: CmsService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // You might want to add Guards here for admin access
  async create(@Body() createCmsPageDto: CreateCmsPageZodDto): Promise<CmsPage> {
    return this.cmsService.create(createCmsPageDto);
  }

  @Get()
  // You might want to add Guards here for admin access or limit fields for public
  async findAll(@Query() query: CmsPageQueryZodDto): Promise<PaginatedResponse<CmsPage>> {
    return this.cmsService.findAll(query);
  }

  @Get(':id')
  // You might want to add Guards here for admin access
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CmsPage> {
    return this.cmsService.findOne(id);
  }

  @Public() // This endpoint is for public access (e.g., frontend fetching terms of service)
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<CmsPage> {
    // Only return published pages by default for public endpoint
    return this.cmsService.findBySlug(slug);
  }

  @Patch(':id')
  // You might want to add Guards here for admin access
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateCmsPageDto: UpdateCmsPageZodDto): Promise<CmsPage> {
    return this.cmsService.update(id, updateCmsPageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content for successful deletion
  // You might want to add Guards here for admin access
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.cmsService.remove(id);
  }
}