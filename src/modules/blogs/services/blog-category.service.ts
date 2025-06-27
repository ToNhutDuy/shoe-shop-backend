// src/blog/services/blog-category.service.ts
import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { BlogCategory } from '../entities/blog-category.entity';
import { CreateBlogCategoryZodDto, UpdateBlogCategoryZodDto } from '../dto/blog-category.zod';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { slugify } from 'src/common/helpers/util';

@Injectable()
export class BlogCategoryService {
    private readonly logger = new Logger(BlogCategoryService.name);

    constructor(
        @InjectRepository(BlogCategory)
        private readonly blogCategoryRepository: Repository<BlogCategory>,
    ) { }


    async createCategory(createBlogCategoryDto: CreateBlogCategoryZodDto): Promise<BlogCategory> {
        const { name, ...rest } = createBlogCategoryDto;


        const generatedSlug = slugify(name);

        const existingCategoryByName = await this.blogCategoryRepository.findOne({ where: { name } });
        if (existingCategoryByName) {
            throw new ConflictException(`Tên danh mục '${name}' đã tồn tại.`);
        }

        const existingCategoryBySlug = await this.blogCategoryRepository.findOne({ where: { slug: generatedSlug } });
        if (existingCategoryBySlug) {
            throw new ConflictException(`Slug '${generatedSlug}' đã tồn tại.`);
        }

        const newCategory = this.blogCategoryRepository.create({
            name,
            slug: generatedSlug,
            ...rest,
        });

        const savedCategory: BlogCategory = await this.blogCategoryRepository.save(newCategory);
        this.logger.log(`Tạo danh mục blog mới thành công: ${savedCategory.name} (ID: ${savedCategory.id})`);
        return savedCategory;
    }


    async findAllCategories(
        page: number = 1,
        limit: number = 10,
        search?: string,
        sort?: string,
    ): Promise<PaginatedResponse<BlogCategory>> {
        const queryBuilder = this.blogCategoryRepository.createQueryBuilder('category');

        if (search) {
            queryBuilder.where('category.name ILIKE :search OR category.description ILIKE :search', { search: `%${search}%` });
        }

        // Xử lý sắp xếp
        if (sort) {
            const [field, order] = sort.split(':');
            if (field && ['id', 'name', 'slug', 'created_at'].includes(field)) {
                queryBuilder.orderBy(`category.${field}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
            } else {
                this.logger.warn(`Invalid sort field: ${field}. Defaulting to 'created_at:desc'.`);
                queryBuilder.orderBy('category.created_at', 'DESC');
            }
        } else {
            queryBuilder.orderBy('category.created_at', 'DESC');
        }

        const [categories, totalItems] = await queryBuilder
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: categories,
            meta: {
                currentPage: page,
                itemCount: categories.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }


    async findOneCategory(identifier: number | string): Promise<BlogCategory> {
        const whereClause = typeof identifier === 'number' ? { id: identifier } : { slug: identifier };
        const category = await this.blogCategoryRepository.findOne({ where: whereClause });

        if (!category) {
            throw new NotFoundException(`Danh mục blog với ${typeof identifier === 'number' ? 'ID' : 'slug'} '${identifier}' không tìm thấy.`);
        }
        return category;
    }


    async updateCategory(id: number, updateBlogCategoryDto: UpdateBlogCategoryZodDto): Promise<BlogCategory> {
        const category = await this.blogCategoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException(`Danh mục blog với ID ${id} không tìm thấy.`);
        }

        const { name, ...rest } = updateBlogCategoryDto;

        const finalSlug = slugify(name);



        if (name && name !== category.name) {
            const existingCategoryByName = await this.blogCategoryRepository.findOne({ where: { name, id: Not(id) } });
            if (existingCategoryByName) {
                throw new ConflictException(`Tên danh mục '${name}' đã tồn tại.`);
            }
        }

        if (finalSlug && finalSlug !== category.slug) {
            const existingCategoryBySlug = await this.blogCategoryRepository.findOne({ where: { slug: finalSlug, id: Not(id) } });
            if (existingCategoryBySlug) {
                throw new ConflictException(`Slug '${finalSlug}' đã tồn tại.`);
            }
        }

        Object.assign(category, { name, slug: finalSlug, ...rest });
        const updatedCategory: BlogCategory = await this.blogCategoryRepository.save(category);
        this.logger.log(`Cập nhật danh mục blog ID ${id} thành công.`);
        return updatedCategory;
    }

    async deleteCategory(id: number): Promise<void> {
        const category = await this.blogCategoryRepository.findOne({ where: { id }, relations: ['blogPosts'] });
        if (!category) {
            throw new NotFoundException(`Danh mục blog với ID ${id} không tìm thấy.`);
        }

        if (category.blogPosts && category.blogPosts.length > 0) {
            throw new BadRequestException(`Không thể xóa danh mục '${category.name}' vì có các bài viết liên quan.`);
        }

        await this.blogCategoryRepository.remove(category);
        this.logger.log(`Xóa danh mục blog ID ${id} thành công.`);
    }
}
