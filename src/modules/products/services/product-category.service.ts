import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In, Like } from 'typeorm';
import { ProductCategory } from '../entities/product-category.entity';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from '../schemas/product.schema';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { slugify } from 'src/common/helpers/util';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { Product } from 'src/modules/products/entities/product.entity';

@Injectable()
export class ProductCategoryService {
    private readonly logger = new Logger(ProductCategoryService.name);

    constructor(
        @InjectRepository(ProductCategory)
        private readonly productCategoryRepository: Repository<ProductCategory>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }


    async createCategory(createCategoryDto: CreateProductCategoryDto): Promise<ProductCategory> {

        const categorySlug = slugify(createCategoryDto.name);


        const existingCategoryByName = await this.productCategoryRepository.findOneBy({ name: createCategoryDto.name });
        if (existingCategoryByName) {
            this.logger.warn(`Attempted to create category with duplicate name: "${createCategoryDto.name}"`);
            throw new BadRequestException(`Danh mục sản phẩm có tên "${createCategoryDto.name}" đã tồn tại.`);
        }

        const existingCategoryBySlug = await this.productCategoryRepository.findOneBy({ slug: categorySlug });
        if (existingCategoryBySlug) {
            this.logger.warn(`Attempted to create category with duplicate slug: "${categorySlug}"`);
            throw new BadRequestException(`Danh mục sản phẩm có slug "${categorySlug}" đã tồn tại.`);
        }

        let parentCategory: ProductCategory | null = null;
        if (createCategoryDto.parentCategoryId) {
            parentCategory = await this.productCategoryRepository.findOneBy({ id: createCategoryDto.parentCategoryId });
            if (!parentCategory) {
                throw new NotFoundException(`Không tìm thấy danh mục cha với ID ${createCategoryDto.parentCategoryId}.`);
            }

            if (parentCategory.id === undefined) {
                throw new BadRequestException(`ID danh mục cha không hợp lệ.`);
            }
        }

        const category = this.productCategoryRepository.create({
            ...createCategoryDto,
            slug: categorySlug,
            display_order: createCategoryDto.displayOrder ?? 0,
            parentCategory: parentCategory,
        });

        const savedCategory = await this.productCategoryRepository.save(category);
        this.logger.log(`Created product category with ID: ${savedCategory.id}, Name: "${savedCategory.name}", Slug: "${savedCategory.slug}"`);
        return savedCategory;
    }


    async findAllCategories(query: PaginationQueryDto): Promise<PaginatedResponse<ProductCategory>> {
        const { current = 1, pageSize = 10, search } = query;
        const skip = (current - 1) * pageSize;

        const findOptions: FindManyOptions<ProductCategory> = {
            take: pageSize,
            skip: skip,
            order: { name: 'ASC' },
            relations: ['parentCategory'],
        };

        if (search) {
            findOptions.where = [
                { name: Like(`%${search}%`) },
                { slug: Like(`%${slugify(search)}%`) },
            ];
        }

        const [categories, totalItems] = await this.productCategoryRepository.findAndCount(findOptions);

        const totalPages = Math.ceil(totalItems / pageSize);
        const hasNextPage = current < totalPages;
        const hasPreviousPage = current > 1;

        return {
            data: categories,
            meta: {
                currentPage: current,
                itemCount: categories.length,
                itemsPerPage: pageSize,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }


    async findCategoryById(id: number): Promise<ProductCategory> {
        const category = await this.productCategoryRepository.findOne({
            where: { id },
            relations: ['parentCategory', 'childrenCategories'],
        });
        if (!category) {
            this.logger.warn(`Product category with ID ${id} not found.`);
            throw new NotFoundException(`Không tìm thấy danh mục sản phẩm với ID ${id}.`);
        }
        return category;
    }


    async updateCategory(id: number, updateCategoryDto: UpdateProductCategoryDto): Promise<ProductCategory> {
        const category = await this.findCategoryById(id);

        if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
            const existingCategoryByName = await this.productCategoryRepository.findOneBy({ name: updateCategoryDto.name });
            if (existingCategoryByName && existingCategoryByName.id !== id) {
                this.logger.warn(`Attempted to update category ID ${id} with duplicate name: "${updateCategoryDto.name}"`);
                throw new BadRequestException(`Danh mục sản phẩm có tên "${updateCategoryDto.name}" đã tồn tại.`);
            }


            const newSlug = slugify(updateCategoryDto.name);
            const existingCategoryBySlug = await this.productCategoryRepository.findOneBy({ slug: newSlug });
            if (existingCategoryBySlug && existingCategoryBySlug.id !== id) {
                this.logger.warn(`Generated slug "${newSlug}" for category ID ${id} conflicts with existing category ID ${existingCategoryBySlug.id}.`);
                throw new BadRequestException(`Slug "${newSlug}" được tạo từ tên mới đã tồn tại cho danh mục khác.`);
            }
            category.name = updateCategoryDto.name;
            category.slug = newSlug;
        }

        if (updateCategoryDto.parentCategoryId !== undefined) {
            if (updateCategoryDto.parentCategoryId === null) {
                category.parentCategory = null;
            } else {
                if (updateCategoryDto.parentCategoryId === id) {
                    throw new BadRequestException('Một danh mục không thể là cha của chính nó.');
                }
                const parentCategory = await this.productCategoryRepository.findOneBy({ id: updateCategoryDto.parentCategoryId });
                if (!parentCategory) {
                    throw new NotFoundException(`Không tìm thấy danh mục cha với ID ${updateCategoryDto.parentCategoryId}.`);
                }

                let currentParent: ProductCategory | null = parentCategory;
                while (currentParent) {
                    if (currentParent.id === id) {
                        throw new BadRequestException('Phát hiện quan hệ cha-con vòng lặp. Không thể đặt danh mục này làm cha.');
                    }
                    currentParent = await this.productCategoryRepository.findOne({
                        where: { id: currentParent.id },
                        relations: ['parentCategory']
                    });
                    currentParent = currentParent?.parentCategory || null;
                }
                category.parentCategory = parentCategory;
            }
        }
        Object.assign(category, {
            description: updateCategoryDto.description ?? category.description,
            is_active: updateCategoryDto.isActive ?? category.is_active,
            display_order: updateCategoryDto.displayOrder ?? category.display_order,
        });

        const updatedCategory = await this.productCategoryRepository.save(category);
        this.logger.log(`Updated product category with ID: ${id}, Name: "${updatedCategory.name}", Slug: "${updatedCategory.slug}"`);
        return updatedCategory;
    }



    async deleteCategory(id: number): Promise<void> {

        const childrenCount = await this.productCategoryRepository.count({
            where: { parentCategory: { id } }
        });
        if (childrenCount > 0) {
            throw new BadRequestException(`Không thể xóa danh mục sản phẩm với ID ${id} vì nó có ${childrenCount} danh mục con. Vui lòng gán lại hoặc xóa chúng trước.`);
        }


        const productsCount = await this.productRepository.count({
            where: { category: { id } }
        });
        if (productsCount > 0) {
            throw new BadRequestException(`Không thể xóa danh mục sản phẩm với ID ${id} vì nó được liên kết với ${productsCount} sản phẩm. Vui lòng gán lại hoặc xóa chúng trước.`);
        }

        const result = await this.productCategoryRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`Attempted to delete product category ID ${id} but it was not found.`);
            throw new NotFoundException(`Không tìm thấy danh mục sản phẩm với ID ${id}.`);
        }
        this.logger.log(`Deleted product category with ID: ${id}`);
    }



    async findCategoriesByIds(ids: number[]): Promise<ProductCategory[]> {
        return this.productCategoryRepository.find({
            where: { id: In(ids) },
        });
    }
}