// src/blog/services/tag.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';


import { Tag } from '../entities/tag.entity';
import { CreateTagZodDto, UpdateTagZodDto } from '../dto/tag.zod';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { slugify } from 'src/common/helpers/util';

@Injectable()
export class TagService {
    private readonly logger = new Logger(TagService.name);

    constructor(
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
    ) { }


    async createTag(createTagDto: CreateTagZodDto): Promise<Tag> {
        const { title, ...rest } = createTagDto;

        const generatedSlug = slugify(title);

        const existingTagByName = await this.tagRepository.findOne({ where: { title } });
        if (existingTagByName) {
            throw new ConflictException(`Tên thẻ '${title}' đã tồn tại.`);
        }

        const existingTagBySlug = await this.tagRepository.findOne({ where: { slug: generatedSlug } });
        if (existingTagBySlug) {
            throw new ConflictException(`Slug '${generatedSlug}' đã tồn tại.`);
        }

        const newTag = this.tagRepository.create({
            title,
            slug: generatedSlug,
            ...rest,
        });

        const savedTag: Tag = await this.tagRepository.save(newTag);
        this.logger.log(`Tạo thẻ mới thành công: ${savedTag.title} (ID: ${savedTag.id})`);
        return savedTag;
    }


    async findAllTags(
        page: number = 1,
        limit: number = 10,
        search?: string,
        sort?: string,
    ): Promise<PaginatedResponse<Tag>> {
        const queryBuilder = this.tagRepository.createQueryBuilder('tag');

        if (search) {
            queryBuilder.where('tag.name ILIKE :search', { search: `%${search}%` });
        }
        if (sort) {
            const [field, order] = sort.split(':');
            if (field && ['id', 'name', 'slug', 'created_at'].includes(field)) {
                queryBuilder.orderBy(`tag.${field}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
            } else {
                this.logger.warn(`Invalid sort field: ${field}. Defaulting to 'created_at:desc'.`);
                queryBuilder.orderBy('tag.created_at', 'DESC');
            }
        } else {
            queryBuilder.orderBy('tag.created_at', 'DESC');
        }

        const [tags, totalItems] = await queryBuilder
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: tags,
            meta: {
                currentPage: page,
                itemCount: tags.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }


    async findOneTag(identifier: number | string): Promise<Tag> {
        const whereClause = typeof identifier === 'number' ? { id: identifier } : { slug: identifier };
        const tag = await this.tagRepository.findOne({ where: whereClause });

        if (!tag) {
            throw new NotFoundException(`Thẻ với ${typeof identifier === 'number' ? 'ID' : 'slug'} '${identifier}' không tìm thấy.`);
        }
        return tag;
    }

    async updateTag(id: number, updateTagDto: UpdateTagZodDto): Promise<Tag> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException(`Thẻ với ID ${id} không tìm thấy.`);
        }

        const { title, ...rest } = updateTagDto;
        const finalSlug = slugify(title);

        if (title && title !== tag.title) {
            const existingTagByName = await this.tagRepository.findOne({ where: { title, id: Not(id) } });
            if (existingTagByName) {
                throw new ConflictException(`Tên thẻ '${title}' đã tồn tại.`);
            }
        }

        if (finalSlug && finalSlug !== tag.slug) {
            const existingTagBySlug = await this.tagRepository.findOne({ where: { slug: finalSlug, id: Not(id) } });
            if (existingTagBySlug) {
                throw new ConflictException(`Slug '${finalSlug}' đã tồn tại.`);
            }
        }

        Object.assign(tag, { name, slug: finalSlug, ...rest });
        const updatedTag: Tag = await this.tagRepository.save(tag);
        this.logger.log(`Cập nhật thẻ ID ${id} thành công.`);
        return updatedTag;
    }


    async deleteTag(id: number): Promise<void> {
        const tag = await this.tagRepository.findOne({ where: { id } });
        if (!tag) {
            throw new NotFoundException(`Thẻ với ID ${id} không tìm thấy.`);
        }

        await this.tagRepository.remove(tag);
        this.logger.log(`Xóa thẻ ID ${id} thành công.`);
    }
}
