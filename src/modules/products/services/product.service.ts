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
import { MediaService } from 'src/modules/media/media.service';
import { Media } from 'src/modules/media/entities/media.entity';

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
        @InjectRepository(ProductReview)
        private readonly productReviewRepository: Repository<ProductReview>,
        private readonly productCategoryService: ProductCategoryService,
        private readonly brandService: BrandService,
        private readonly attributeService: AttributeService,
        private readonly dataSource: DataSource,
        private readonly productVariantService: ProductVariantService,
        private readonly mediaService: MediaService,
        @InjectRepository(ProductCategory)
        private readonly productCategoryRepository: Repository<ProductCategory>,
    ) { }




    async updateProductImage(id: number, mediaId: number): Promise<Product> {
        const product = await this.productRepository.findOne({ where: { id: id } });
        if (!product) {
            throw new NotFoundException(`Brand with ID ${Product} not found.`);
        }

        const media = await this.mediaService.findOneMedia(mediaId);
        if (!media) {
            throw new NotFoundException(`Media with ID ${mediaId} not found.`);
        }

        product.main_cover_image_media_id = mediaId;
        return this.productRepository.save(product);
    }



    async createProduct(createProductDto: CreateProductDto): Promise<Product> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { categoryId, brandId, ...productData } = createProductDto;

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


            const existingProductBySlug = await queryRunner.manager.findOneBy(Product, { slug: generatedSlug });
            if (existingProductBySlug) {
                throw new BadRequestException(`Sản phẩm với slug "${generatedSlug}" đã tồn tại.`);
            }


            const newProduct = queryRunner.manager.create(Product, {
                ...productData,
                slug: generatedSlug,
                category: category,
                brand: brand ?? undefined,
            });

            const savedProduct = await queryRunner.manager.save(newProduct);




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
    async findProductBySlug(slug: string): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { slug },
            relations: [
                'category',
                'brand',
                'product_image',
                'variants',
                'variants.variant_image',
                'variants.attributeValues',
                'variants.attributeValues.attributeValue',
                'variants.attributeValues.attributeValue.attribute',
                'reviews',
                'reviews.user',
            ],
            order: {
                variants: {
                    id: 'ASC',
                },
            },
        });

        if (!product) {
            throw new NotFoundException(`Không tìm thấy sản phẩm với slug "${slug}"`);
        }

        return product;
    }

    async findAllProductsByCategorySlug(
        categorySlug: string,
    ): Promise<(Product & { minSellingPrice?: number; maxSellingPrice?: number })[]> {
        const category = await this.productCategoryRepository.findOne({
            where: { slug: categorySlug },
        });

        if (!category) {
            throw new NotFoundException(`Category with slug "${categorySlug}" not found.`);
        }

        const products = await this.productRepository.find({
            where: { category_id: category.id },
            relations: ['product_image', 'brand', 'category', 'variants'], // Đảm bảo tải các quan hệ cần thiết, đặc biệt là variants
            order: { id: 'ASC' }, // Sắp xếp mặc định
        });

        // Tính toán minSellingPrice và maxSellingPrice cho mỗi sản phẩm
        const productsWithPrices = products.map(p => {
            let minPrice: number | undefined;

            if (p.variants && p.variants.length > 0) {
                const sellingPrices = p.variants.map(v => v.selling_price);
                minPrice = Math.min(...sellingPrices);
            }
            return {
                ...p,
                minSellingPrice: minPrice,

            };
        });

        return productsWithPrices;
    }


    //Tìm Tất cả Sản phẩm

    async findAllProducts(query: PaginationQueryDto): Promise<PaginatedResponse<Product & { minSellingPrice?: number }>> {
        const page = query.current ?? 1;
        const limit = query.pageSize ?? 10;
        const search = query.search?.trim();
        const sort = query.sort;
        const skip = (page - 1) * limit;

        let orderBy: Record<string, 'ASC' | 'DESC'> = { name: 'ASC' }; // Mặc định

        if (sort) {
            const [field, direction] = sort.split(':');
            const dir = direction?.toUpperCase();
            if (field && (dir === 'ASC' || dir === 'DESC')) {
                orderBy = { [field]: dir as 'ASC' | 'DESC' };
            }
        }

        const findOptions: FindManyOptions<Product> = {
            take: limit,
            skip,
            order: orderBy,
            relations: [
                'category',
                'brand',
                'variants', // Quan trọng: phải tải variants để tính minSellingPrice
                'product_image', // Quan trọng: tải quan hệ ảnh chính
            ],
        };

        if (search) {
            findOptions.where = [
                { name: Like(`%${search}%`) },
            ];
        }

        try {
            const [products, totalItems] = await this.productRepository.findAndCount(findOptions);

            // Gắn thêm URL ảnh chính và tính toán minSellingPrice cho từng sản phẩm
            const productsWithResolvedData = products.map((product) => {
                // 1. Lấy URL ảnh chính
                const imageUrl = product.product_image ? (product.product_image as Media).full_url : undefined;

                // 2. Tính toán minSellingPrice từ các biến thể đã tải
                let minPrice: number | null = null;
                if (product.variants && product.variants.length > 0) {
                    // Cách dùng Array.prototype.map và Math.min để lấy giá thấp nhất
                    minPrice = Math.min(...product.variants.map(variant => variant.selling_price));

                    // Nếu bạn chỉ muốn lấy giá của biến thể đầu tiên:
                    // const firstVariantPrice = product.variants[0].selling_price;
                }

                return {
                    ...product,
                    mainCoverImage_full_url: imageUrl, // Gắn URL ảnh vào đây
                    minSellingPrice: minPrice ?? undefined, // Gắn giá thấp nhất vào đây
                };
            });

            const totalPages = Math.ceil(totalItems / limit);

            return {
                data: productsWithResolvedData,
                meta: {
                    currentPage: page,
                    itemCount: products.length,
                    itemsPerPage: limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            this.logger.error('Error in findAllProducts:', error.message, error.stack);
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
                relations: ['category', 'brand', 'variants', 'variants.attributeValues', 'variants.attributeValues.attributeValue', 'variants.attributeValues.attributeValue.attribute'],
            });

            if (!product) {
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}.`);
            }

            const { categoryId, brandId, ...productData } = updateProductDto;


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
            const product = await this.productRepository.findOne({
                where: { id },
                relations: ['variants'],
            });

            if (!product) {
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}.`);
            }

            // Xóa đánh giá sản phẩm
            await queryRunner.manager.delete(ProductReview, { product: { id } });

            // Xóa biến thể và giá trị thuộc tính của biến thể nếu có
            if (product.variants && product.variants.length > 0) {
                const variantIds = product.variants.map((v) => v.id);
                await queryRunner.manager.delete(ProductVariantAttributeValue, {
                    productVariant: { id: In(variantIds) },
                });
                await queryRunner.manager.delete(ProductVariant, { product: { id } });
            }

            // Xóa chính sản phẩm
            const result = await queryRunner.manager.delete(Product, { id });

            if (result.affected === 0) {
                this.logger.warn(`Attempted to delete product ID ${id} but no rows were affected.`);
                throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id} (sau kiểm tra ban đầu)`);
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Đã xóa sản phẩm với ID: ${id}`);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Lỗi khi xóa sản phẩm ID ${id}: ${err.message}`, err.stack);
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