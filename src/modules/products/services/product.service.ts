import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In, DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductVariantAttributeValue } from '../entities/product-variant-attribute-value.entity';
import { ProductGalleryMedia } from '../entities/product-gallery-media.entity';
import { ProductReview } from '../entities/product-review.entity';
import {
    CreateProductDto,
    UpdateProductDto,
    CreateProductReviewDto,
    UpdateProductReviewDto,
    AddVariantAttributeValueDto,
} from '../schemas/product.schema';

import { ProductCategoryService } from './product-category.service';
import { BrandService } from './brand.service';
import { AttributeService } from './attribute.service';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { ProductVariantService } from './product-variant.service';
import { ProductCategory } from '../entities/product-category.entity';
import { Brand } from '../entities/brand.entity';
import unidecode from 'unidecode';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(ProductVariant)
        private readonly productVariantRepository: Repository<ProductVariant>,
        @InjectRepository(ProductVariantAttributeValue)
        private readonly productVariantAttributeValueRepository: Repository<ProductVariantAttributeValue>,
        @InjectRepository(ProductGalleryMedia)
        private readonly productGalleryMediaRepository: Repository<ProductGalleryMedia>,
        @InjectRepository(ProductReview)
        private readonly productReviewRepository: Repository<ProductReview>,
        private readonly productCategoryService: ProductCategoryService,
        private readonly brandService: BrandService,
        private readonly attributeService: AttributeService,
        private readonly dataSource: DataSource,
        private readonly productVariantService: ProductVariantService,
    ) { }



    //Quản lý Sản phẩm

    // Tạo Sản phẩm Mới



    async createProduct(createProductDto: CreateProductDto): Promise<Product> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { categoryId, brandId, galleryMedia, baseSku, ...productData } = createProductDto;

            // Tự động tạo slug từ tên sản phẩm
            const generatedSlug = unidecode(productData.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');


            const category = await queryRunner.manager.findOneBy(ProductCategory, { id: categoryId });
            if (!category) {
                throw new NotFoundException(`Không tìm thấy danh mục sản phẩm với ID ${categoryId}.`);
            }

            let brand: Brand | null = null;
            if (brandId) {
                brand = await queryRunner.manager.findOneBy(Brand, { id: brandId });
                if (!brand) {
                    throw new NotFoundException(`Không tìm thấy thương hiệu với ID ${brandId}.`);
                }
            }


            const existingProductBySku = await queryRunner.manager.findOneBy(Product, { base_sku: baseSku });
            if (existingProductBySku) {
                throw new BadRequestException(`Sản phẩm với Base SKU "${baseSku}" đã tồn tại.`);
            }


            const existingProductBySlug = await queryRunner.manager.findOneBy(Product, { slug: generatedSlug });
            if (existingProductBySlug) {
                throw new BadRequestException(`Sản phẩm với slug "${generatedSlug}" đã tồn tại.`);
            }


            const newProduct = queryRunner.manager.create(Product, {
                ...productData,
                slug: generatedSlug,
                base_sku: baseSku,
                category: category,
                brand: brand ?? undefined,
            });

            const savedProduct = await queryRunner.manager.save(newProduct);


            if (galleryMedia && galleryMedia.length > 0) {
                const galleryEntities = galleryMedia.map(mediaDto =>
                    queryRunner.manager.create(ProductGalleryMedia, {
                        ...mediaDto,
                        product: savedProduct,
                    })
                );
                await queryRunner.manager.save(galleryEntities);
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Created product with ID: ${savedProduct.id}`);
            return this.findProductById(savedProduct.id);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to create product: ${error.message}`, error.stack);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }


    //Tìm Tất cả Sản phẩm


    async findAllProducts(query: PaginationQueryDto): Promise<PaginatedResponse<Product>> {
        const page = query.current ?? 1;
        const limit = query.pageSize ?? 10;
        const search = query.search;
        const sort = query.sort;
        const skip = (page - 1) * limit;

        let orderBy: Record<string, 'ASC' | 'DESC'> = { name: 'ASC' }; // mặc định

        if (sort) {
            const [field, direction] = sort.split(':');
            const dir = direction?.toUpperCase();
            if (field && (dir === 'ASC' || dir === 'DESC')) {
                orderBy = { [field]: dir as 'ASC' | 'DESC' };
            }
        }

        const findOptions: FindManyOptions<Product> = {
            take: limit,
            skip: skip,
            order: orderBy,
            relations: [
                'category',
                'brand',
                'variants',
                'variants.attributeValues',
                'variants.attributeValues.attributeValue',
                'variants.attributeValues.attributeValue.attribute',
                'galleryMedia',
            ],
        };

        if (search) {
            findOptions.where = [
                { name: Like(`%${search}%`) },
                { base_sku: Like(`%${search}%`) },
            ];
        }

        try {
            const [products, totalItems] = await this.productRepository.findAndCount(findOptions);

            const totalPages = Math.ceil(totalItems / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                data: products,
                meta: {
                    currentPage: page,
                    itemCount: products.length,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                },
            };
        } catch (error) {
            console.error('Error in findAllProducts:', error);
            throw new InternalServerErrorException('Không thể lấy danh sách sản phẩm.');
        }
    }


    //Tìm Sản phẩm theo ID


    async findProductById(id: number): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: [
                'category',
                'brand',
                'variants',
                'variants.attributeValues',
                'variants.attributeValues.attributeValue',
                'variants.attributeValues.attributeValue.attribute',
                'galleryMedia',
                'reviews',
            ],
        });
        if (!product) {
            throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
        }
        return product;
    }


    // Cập nhật Sản phẩm


    async updateProduct(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Tìm sản phẩm hiện có cùng với các mối quan hệ của nó để dễ dàng cập nhật
            const product = await queryRunner.manager.findOne(Product, {
                where: { id },
                relations: ['category', 'brand', 'variants', 'galleryMedia', 'variants.attributeValues', 'variants.attributeValues.attributeValue', 'variants.attributeValues.attributeValue.attribute'],
            });

            if (!product) {
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}.`);
            }

            const { categoryId, brandId, galleryMedia, baseSku, ...productData } = updateProductDto;


            if (categoryId !== undefined && categoryId !== product.category?.id) {
                const category = await queryRunner.manager.findOneBy(ProductCategory, { id: categoryId });
                if (!category) {
                    throw new NotFoundException(`Không tìm thấy danh mục sản phẩm với ID ${categoryId}.`);
                }
                product.category = category;
            }


            if (brandId !== undefined) {
                if (brandId === null) {
                    throw new BadRequestException('Không có thương hiệu')
                } else if (brandId !== product.brand?.id) {
                    const brand = await queryRunner.manager.findOneBy(Brand, { id: brandId });
                    if (!brand) {
                        throw new NotFoundException(`Không tìm thấy thương hiệu với ID ${brandId}.`);
                    }
                    product.brand = brand;
                }
            }


            if (baseSku) {
                const existingProduct = await queryRunner.manager.findOneBy(Product, { base_sku: baseSku });
                if (existingProduct && existingProduct.id !== id) {
                    throw new BadRequestException(`Sản phẩm với Base SKU "${baseSku}" đã tồn tại.`);
                }
            }

            if (productData.name && productData.name !== product.name) {
                const generatedSlug = unidecode(productData.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');
                const existingProductBySlug = await queryRunner.manager.findOneBy(Product, { slug: generatedSlug });
                if (existingProductBySlug && existingProductBySlug.id !== id) {
                    throw new BadRequestException(`Sản phẩm với slug "${generatedSlug}" đã tồn tại.`);
                }
                product.name = productData.name;
                product.slug = generatedSlug;
            } else if (productData.name === undefined && product.name) {

            }

            queryRunner.manager.merge(Product, product, productData);
            const savedProduct = await queryRunner.manager.save(product);

            if (galleryMedia !== undefined) {
                const existingMediaIds = new Set(product.galleryMedia.map(m => m.mediaId));
                const incomingMediaIds = new Set(galleryMedia.map(m => m.mediaId));

                const mediaToDelete = product.galleryMedia.filter(m => !incomingMediaIds.has(m.mediaId));
                for (const media of mediaToDelete) {
                    await queryRunner.manager.remove(media);
                }

                for (const mediaDto of galleryMedia) {
                    let targetMedia = product.galleryMedia.find(m => m.mediaId === mediaDto.mediaId);
                    if (targetMedia) {

                        queryRunner.manager.merge(ProductGalleryMedia, targetMedia, mediaDto);
                        await queryRunner.manager.save(targetMedia);
                    } else {
                        targetMedia = queryRunner.manager.create(ProductGalleryMedia, {
                            ...mediaDto,
                            product: savedProduct,
                        });
                        await queryRunner.manager.save(targetMedia);
                    }
                }
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Updated product with ID: ${id} `);
            return this.findProductById(savedProduct.id);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to update product with ID ${id}: ${error.message} `, error.stack);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }


    async deleteProduct(id: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const product = await this.productRepository.findOne({ where: { id }, relations: ['variants'] });
            if (!product) {
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}.`);
            }
            await queryRunner.manager.delete(ProductGalleryMedia, { product: { id: id } });

            await queryRunner.manager.delete(ProductReview, { product: { id: id } });
            if (product.variants && product.variants.length > 0) {
                const variantIds = product.variants.map(v => v.id);
                await queryRunner.manager.delete(ProductVariantAttributeValue, { productVariant: { id: In(variantIds) } });
                await queryRunner.manager.delete(ProductVariant, { product: { id: id } });
            }

            const result = await queryRunner.manager.delete(Product, id);
            if (result.affected === 0) {
                this.logger.warn(`Attempted to delete product ID ${id} but no rows were affected.`);
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id} (sau kiểm tra ban đầu)`);
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Deleted product with ID: ${id} `);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to delete product with ID ${id}: ${err.message} `, err.stack);
            throw err;
        } finally {
            await queryRunner.release();
        }
    }


    async createProductReview(createReviewDto: CreateProductReviewDto): Promise<ProductReview> {

        const product = await this.findProductById(createReviewDto.productId);
        const review = this.productReviewRepository.create({
            ...createReviewDto,
            product: product,
            user: { id: createReviewDto.userId } as any,
            order: createReviewDto.orderId ? { id: createReviewDto.orderId } as any : null,
            reviewed_at: createReviewDto.reviewedAt || new Date(),
        });

        const savedReview = await this.productReviewRepository.save(review);
        await this.updateProductAverageRating(createReviewDto.productId);

        this.logger.log(`Created review for product ID ${createReviewDto.productId} with review ID: ${savedReview.id}`);
        return savedReview;
    }



    async findAllProductReviews(query: PaginationQueryDto, productId?: number): Promise<PaginatedResponse<ProductReview>> {
        const page = query.current ?? 1;
        const limit = query.pageSize ?? 10;
        const search = query.search;

        const skip = (page - 1) * limit;

        const findOptions: FindManyOptions<ProductReview> = {
            take: limit,
            skip: skip,
            order: { created_at: 'DESC' },
            relations: ['product', 'user', 'order'],
        };

        const whereConditions: any = {};
        if (productId) {
            whereConditions.product = { id: productId };
        }
        if (search) {
            whereConditions.comment = Like(`%${search}%`);
        }
        if (Object.keys(whereConditions).length > 0) {
            findOptions.where = whereConditions;
        }

        const [reviews, totalItems] = await this.productReviewRepository.findAndCount(findOptions);

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: reviews,
            meta: {
                currentPage: page,
                itemCount: reviews.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async findProductReviewById(id: number): Promise<ProductReview> {
        const review = await this.productReviewRepository.findOne({
            where: { id },
            relations: ['product', 'user', 'order'],
        });
        if (!review) {
            throw new NotFoundException(`Không tìm thấy đánh giá sản phẩm với ID ${id}`);
        }
        return review;
    }



    async updateProductReview(id: number, updateReviewDto: UpdateProductReviewDto): Promise<ProductReview> {
        const review = await this.findProductReviewById(id);
        const oldProductId = review.product.id;

        Object.assign(review, updateReviewDto);

        if (updateReviewDto.productId) {
            const newProduct = await this.productRepository.findOneBy({ id: updateReviewDto.productId });
            if (!newProduct) {
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${updateReviewDto.productId}.`);
            }
            review.product = newProduct;
        }
        if (updateReviewDto.userId) {

            review.user = { id: updateReviewDto.userId } as any;
        }
        if (updateReviewDto.orderId !== undefined) {

            review.order = updateReviewDto.orderId ? { id: updateReviewDto.orderId } as any : null;
        }

        if (updateReviewDto.reviewedAt) {
            review.reviewed_at = updateReviewDto.reviewedAt;
        } else if (updateReviewDto.status === 'approved' && review.status !== 'approved') {
            review.reviewed_at = new Date();
        }

        const updatedReview = await this.productReviewRepository.save(review);

        if (updateReviewDto.productId && updateReviewDto.productId !== oldProductId) {
            await this.updateProductAverageRating(oldProductId);
        }
        await this.updateProductAverageRating(updatedReview.product.id);

        this.logger.log(`Updated review with ID: ${id} for product ID: ${updatedReview.product.id}`);
        return updatedReview;
    }


    async deleteProductReview(id: number): Promise<void> {
        const review = await this.findProductReviewById(id);
        const productId = review.product.id;

        const result = await this.productReviewRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`Attempted to delete review ID ${id} but no rows were affected.`);
            throw new NotFoundException(`Không tìm thấy đánh giá sản phẩm với ID ${id}`);
        }
        await this.updateProductAverageRating(productId);

        this.logger.log(`Deleted review with ID: ${id} for product ID: ${productId}`);
    }



    private async updateProductAverageRating(productId: number): Promise<void> {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            this.logger.warn(`Không tìm thấy sản phẩm với ID ${productId} trong quá trình cập nhật điểm đánh giá trung bình.`);
            return;
        }

        const reviews = await this.productReviewRepository.find({
            where: { product: { id: productId }, status: 'approved' },
        });

        const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0 ? parseFloat((totalRatings / reviewCount).toFixed(2)) : 0.00;

        product.average_rating = averageRating;
        product.review_count = reviewCount;
        await this.productRepository.save(product);
        this.logger.debug(`Updated average rating for product ID ${productId}: ${averageRating} (${reviewCount} reviews)`);
    }
}