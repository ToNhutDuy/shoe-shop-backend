import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, ILike, IsNull, Not } from 'typeorm';
import { CmsPage, CmsPageStatus } from './entities/cms-page.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { CmsPageQueryZodDto, CreateCmsPageZodDto, UpdateCmsPageZodDto } from './dto/create-cms-page.dto';

@Injectable()
export class CmsService {
    private readonly logger = new Logger(CmsService.name);

    constructor(
        @InjectRepository(CmsPage)
        private cmsPageRepository: Repository<CmsPage>,
    ) { }

    async create(createCmsPageDto: CreateCmsPageZodDto): Promise<CmsPage> {
        // Check for unique slug before creating
        const existingPage = await this.cmsPageRepository.findOne({
            where: { slug: createCmsPageDto.slug, deleted_at: IsNull() },
        });
        if (existingPage) {
            throw new BadRequestException(`A CMS page with slug '${createCmsPageDto.slug}' already exists.`);
        }

        const newPage = this.cmsPageRepository.create(createCmsPageDto);
        this.logger.log(`Creating new CMS page: ${newPage.title}`);
        return this.cmsPageRepository.save(newPage);
    }

    async findAll(query: CmsPageQueryZodDto): Promise<PaginatedResponse<CmsPage>> {
        const { page = 1, limit = 10, search, status } = query;
        const skip = (page - 1) * limit;

        const queryBuilder = this.cmsPageRepository.createQueryBuilder('cms_page')
            .where('cms_page.deleted_at IS NULL'); // Only active (not soft-deleted) pages

        if (search) {
            queryBuilder.andWhere(
                '(cms_page.title ILIKE :search OR cms_page.content_html ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (status) {
            queryBuilder.andWhere('cms_page.status = :status', { status });
        }

        const [data, totalItems] = await queryBuilder
            .orderBy('cms_page.created_at', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const itemCount = data.length;

        return {
            data,
            meta: {
                currentPage: page,
                itemCount,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    async findOne(id: number): Promise<CmsPage> {
        const page = await this.cmsPageRepository.findOne({
            where: { id, deleted_at: IsNull() },
        });
        if (!page) {
            throw new NotFoundException(`CMS Page with ID ${id} not found or has been deleted.`);
        }
        return page;
    }

    async findBySlug(slug: string, includeDraft: boolean = false): Promise<CmsPage> {
        const whereCondition: FindOneOptions<CmsPage>['where'] = {
            slug,
            deleted_at: IsNull(),
        };

        if (!includeDraft) {
            whereCondition.status = CmsPageStatus.PUBLISHED;
        }

        const page = await this.cmsPageRepository.findOne({
            where: whereCondition,
        });
        if (!page) {
            throw new NotFoundException(`CMS Page with slug '${slug}' not found.`);
        }
        return page;
    }

    async update(id: number, updateCmsPageDto: UpdateCmsPageZodDto): Promise<CmsPage> {
        const page = await this.findOne(id); // Re-use findOne to check existence

        // Check for unique slug if it's being updated
        if (updateCmsPageDto.slug && updateCmsPageDto.slug !== page.slug) {
            const existingPageWithSameSlug = await this.cmsPageRepository.findOne({
                where: { slug: updateCmsPageDto.slug, id: Not(id), deleted_at: IsNull() },
            });
            if (existingPageWithSameSlug) {
                throw new BadRequestException(`A CMS page with slug '${updateCmsPageDto.slug}' already exists.`);
            }
        }

        // Apply updates
        Object.assign(page, updateCmsPageDto);

        this.logger.log(`Updating CMS page ID: ${id}`);
        return this.cmsPageRepository.save(page);
    }

    async remove(id: number): Promise<void> {
        const page = await this.findOne(id); // Re-use findOne to check existence
        this.logger.log(`Soft-deleting CMS page ID: ${id}`);
        await this.cmsPageRepository.softRemove(page); // Soft delete
    }
}