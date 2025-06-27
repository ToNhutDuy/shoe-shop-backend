import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Brand } from '../entities/brand.entity';

import unidecode from 'unidecode';
import { MediaService } from 'src/modules/media/media.service';
import { CreateBrandDto } from '../schemas/product.schema';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { UpdateBrandDto } from '../schemas/product.schema';
import { Media } from 'src/modules/media/entities/media.entity';
import { Product } from '../entities/product.entity';


@Injectable()
export class BrandService {
    private readonly logger = new Logger(BrandService.name);

    constructor(
        @InjectRepository(Brand)
        private brandRepository: Repository<Brand>,
        private readonly mediaService: MediaService,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async createBrand(createBrandDto: CreateBrandDto): Promise<Brand> {
        const { name, logoMediaId, ...rest } = createBrandDto;


        const existingNameBrand = await this.brandRepository.findOne({ where: { name: name } });
        if (existingNameBrand) {
            throw new BadRequestException(`Tên thương hiệu '${name}' đã tồn tại.`);
        }

        const generatedSlug = unidecode(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');

        const existingSlugBrand = await this.brandRepository.findOne({ where: { slug: generatedSlug } });
        if (existingSlugBrand) {
            throw new BadRequestException(`Thương hiệu với slug '${generatedSlug}' đã tồn tại.`);
        }

        if (logoMediaId) {
            const mediaExists = await this.mediaService.findOneMedia(logoMediaId);
            if (!mediaExists) {
                throw new NotFoundException(`Media với ID ${logoMediaId} không tìm thấy.`);
            }
        }

        const brand = this.brandRepository.create({
            name,
            slug: generatedSlug,
            logo_media_id: logoMediaId || null,
            ...rest,
        });

        return this.brandRepository.save(brand);
    }

    async findAllBrands(paginationQuery: PaginationQueryDto): Promise<PaginatedResponse<Brand>> {

        const { current = 1, pageSize = 10, search, sort } = paginationQuery;

        const queryBuilder = this.brandRepository.createQueryBuilder('brand');

        queryBuilder.leftJoinAndSelect('brand.logo', 'logo');

        if (search) {
            queryBuilder.andWhere('LOWER(brand.name) LIKE LOWER(:search)', { search: `%${search}%` });
        }

        const allowedSortColumnsMap = {
            id: 'id',
            name: 'name',
            slug: 'slug',
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        };

        if (sort && sort.includes(':')) {
            const [sortBy, sortOrderRaw] = sort.split(':');
            const column = allowedSortColumnsMap[sortBy];
            const order: 'ASC' | 'DESC' = sortOrderRaw?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            if (column) {
                queryBuilder.orderBy(`brand.${column}`, order);
            } else {
                this.logger.warn(`Invalid sort column: "${sortBy}". Using default.`);
                queryBuilder.orderBy('brand.created_at', 'DESC');
            }
        } else {
            queryBuilder.orderBy('brand.created_at', 'DESC');
        }


        const [data, totalItems] = await queryBuilder
            .skip((current - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        const brandsWithResolvedLogo = data.map(brand => {
            return {
                ...brand,

                logo_full_url: brand.logo ? (brand.logo as Media).full_url || (brand.logo as Media).full_url : undefined
            };
        });

        const totalPages = Math.ceil(totalItems / pageSize);
        const itemCount = brandsWithResolvedLogo.length;

        return {
            data: brandsWithResolvedLogo,
            meta: {
                currentPage: current, // 'current' giờ đây chắc chắn là number
                itemCount,
                itemsPerPage: pageSize, // 'pageSize' giờ đây chắc chắn là number
                totalItems,
                totalPages,
                hasNextPage: current < totalPages,
                hasPreviousPage: current > 1,
            },
        };
    }
    async findOneBrand(id: number): Promise<Brand> {
        const brand = await this.brandRepository.findOne({ where: { id }, relations: ['logo'] });
        if (!brand) {
            throw new NotFoundException(`Thương hiệu với ID ${id} không tìm thấy.`);
        }

        return brand;
    }

    async updateBrand(id: number, updateBrandDto: UpdateBrandDto): Promise<Brand> {
        const brand = await this.brandRepository.findOne({ where: { id } });
        if (!brand) {
            throw new NotFoundException(`Thương hiệu với ID ${id} không tìm thấy.`);
        }

        const { name, logoMediaId, ...rest } = updateBrandDto;

        if (name && name !== brand.name) {

            const existingNameBrand = await this.brandRepository.findOne({ where: { name: name, id: Not(id) } });
            if (existingNameBrand) {
                throw new BadRequestException(`Tên thương hiệu '${name}' đã tồn tại.`);
            }


            const generatedSlug = unidecode(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');
            const existingSlugBrand = await this.brandRepository.findOne({ where: { slug: generatedSlug, id: Not(id) } });
            if (existingSlugBrand) {
                throw new BadRequestException(`Thương hiệu với slug '${generatedSlug}' đã tồn tại.`);
            }
            brand.name = name;
            brand.slug = generatedSlug;
        }

        if (logoMediaId !== undefined) {
            if (logoMediaId !== null) {
                const mediaExists = await this.mediaService.findOneMedia(logoMediaId);
                if (!mediaExists) {
                    throw new NotFoundException(`Media với ID ${logoMediaId} không tìm thấy.`);
                }
            }
            brand.logo_media_id = logoMediaId;
        }

        Object.assign(brand, rest);
        return this.brandRepository.save(brand);
    }

    // async removeBrand(id: number): Promise<void> {
    //     const brand = await this.brandRepository.findOne({ where: { id } });
    //     if (!brand) {
    //         throw new NotFoundException(`Thương hiệu với ID ${id} không tìm thấy.`);
    //     }
    //     await this.brandRepository.remove(brand);
    // }

    async deleteBrand(id: number): Promise<void> {
        const usedInProducts = await this.productRepository.count({
            where: { brand: { id } },
        });

        if (usedInProducts > 0) {
            throw new BadRequestException('Không thể xóa thương hiệu vì đang được sử dụng trong sản phẩm.');
        }

        const result = await this.brandRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('Không tìm thấy thương hiệu.');
        }
    }


    async updateBrandLogo(brandId: number, mediaId: number): Promise<Brand> {
        const brand = await this.brandRepository.findOne({ where: { id: brandId } });
        if (!brand) {
            throw new NotFoundException(`Brand with ID ${brandId} not found.`);
        }

        const media = await this.mediaService.findOneMedia(mediaId);
        if (!media) {
            throw new NotFoundException(`Media with ID ${mediaId} not found.`);
        }

        brand.logo_media_id = mediaId;
        return this.brandRepository.save(brand);
    }
}
