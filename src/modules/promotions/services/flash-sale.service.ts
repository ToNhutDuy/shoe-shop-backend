// src/modules/promotions/services/flash-sale.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { FlashSale } from '../entities/flash-sale.entity';
import { FlashSaleProduct } from '../entities/flash-sale-product.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { CreateFlashSaleZodDto, UpdateFlashSaleZodDto } from '../dto/flash-sale.zod';

@Injectable()
export class FlashSaleService {
    private readonly logger = new Logger(FlashSaleService.name);

    constructor(
        @InjectRepository(FlashSale)
        private readonly flashSaleRepository: Repository<FlashSale>,
        @InjectRepository(FlashSaleProduct)
        private readonly flashSaleProductRepository: Repository<FlashSaleProduct>,
    ) { }


    async createFlashSale(createFlashSaleDto: CreateFlashSaleZodDto): Promise<FlashSale> {
        const { products, ...flashSaleData } = createFlashSaleDto;

        const newFlashSale = this.flashSaleRepository.create(flashSaleData);
        const savedFlashSale: FlashSale = await this.flashSaleRepository.save(newFlashSale);

        if (products && products.length > 0) {

            const uniqueProductVariantIds = new Set(products.map(p => p.product_variant_id));
            if (uniqueProductVariantIds.size !== products.length) {
                throw new BadRequestException('Mỗi biến thể sản phẩm chỉ có thể xuất hiện một lần trong cùng một Flash Sale.');
            }

            const flashSaleProducts = products.map(productDto =>
                this.flashSaleProductRepository.create({
                    ...productDto,
                    flash_sale_id: savedFlashSale.id,
                    product_variant_id: productDto.product_variant_id
                }) as FlashSaleProduct
            );

            await this.flashSaleProductRepository.save(flashSaleProducts);
            savedFlashSale.flashSaleProducts = flashSaleProducts;
        }

        this.logger.log(`Tạo Flash Sale mới thành công: ${savedFlashSale.name} (ID: ${savedFlashSale.id})`);
        return savedFlashSale;
    }

    async findAllFlashSales(
        page: number = 1,
        limit: number = 10,
        search?: string,
        sort?: string,
        isActive?: boolean,
    ): Promise<PaginatedResponse<FlashSale>> {
        const queryBuilder = this.flashSaleRepository.createQueryBuilder('flashSale');

        if (search) {
            queryBuilder.where('flashSale.name ILIKE :search', { search: `%${search}%` });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('flashSale.is_active = :isActive', { isActive });
        }
        if (sort) {
            const [field, order] = sort.split(':');
            if (field && ['id', 'name', 'starts_at', 'ends_at', 'created_at'].includes(field)) {
                queryBuilder.orderBy(`flashSale.${field}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
            } else {
                this.logger.warn(`Invalid sort field: ${field}. Defaulting to 'created_at:desc'.`);
                queryBuilder.orderBy('flashSale.created_at', 'DESC');
            }
        } else {
            queryBuilder.orderBy('flashSale.created_at', 'DESC');
        }

        const [flashSales, totalItems] = await queryBuilder
            .leftJoinAndSelect('flashSale.flashSaleProducts', 'flashSaleProduct')
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: flashSales,
            meta: {
                currentPage: page,
                itemCount: flashSales.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async findOneFlashSale(id: number): Promise<FlashSale> {
        const flashSale = await this.flashSaleRepository.findOne({
            where: { id },
            relations: ['flashSaleProducts'],
        });
        if (!flashSale) {
            throw new NotFoundException(`Flash Sale với ID ${id} không tìm thấy.`);
        }
        return flashSale;
    }


    async updateFlashSale(id: number, updateFlashSaleDto: UpdateFlashSaleZodDto): Promise<FlashSale> {
        const flashSale = await this.flashSaleRepository.findOne({ where: { id } });
        if (!flashSale) {
            throw new NotFoundException(`Flash Sale với ID ${id} không tìm thấy.`);
        }

        const { products, ...flashSaleData } = updateFlashSaleDto;

        Object.assign(flashSale, flashSaleData);
        const updatedFlashSale: FlashSale = await this.flashSaleRepository.save(flashSale);

        if (products !== undefined) {
            const existingProducts = await this.flashSaleProductRepository.find({ where: { flash_sale_id: id } });
            const existingProductIds = new Set(existingProducts.map(p => p.id));

            const productsToSave: FlashSaleProduct[] = [];
            const productsToDeleteIds: number[] = [];

            const newOrUpdatedProductVariantIds = new Set<number>();

            for (const productDto of products) {
                if (productDto.product_variant_id === undefined) {
                    throw new BadRequestException(`product_variant_id là bắt buộc cho mỗi sản phẩm khi cập nhật Flash Sale.`);
                }

                if ('id' in productDto && productDto.id) {
                    const existingProduct = existingProducts.find(p => p.id === productDto.id);
                    if (existingProduct) {
                        if (newOrUpdatedProductVariantIds.has(productDto.product_variant_id)) {
                            throw new BadRequestException(`Biến thể sản phẩm ID ${productDto.product_variant_id} bị trùng lặp trong dữ liệu cập nhật.`);
                        }
                        newOrUpdatedProductVariantIds.add(productDto.product_variant_id);

                        Object.assign(existingProduct, productDto);
                        productsToSave.push(existingProduct);
                        existingProductIds.delete(productDto.id);
                    } else {
                        this.logger.warn(`Sản phẩm với ID ${productDto.id} được cung cấp để cập nhật, nhưng không tìm thấy cho Flash Sale ${id}. Coi như thêm mới.`);
                        if (newOrUpdatedProductVariantIds.has(productDto.product_variant_id)) {
                            throw new BadRequestException(`Biến thể sản phẩm ID ${productDto.product_variant_id} bị trùng lặp trong dữ liệu cập nhật.`);
                        }
                        newOrUpdatedProductVariantIds.add(productDto.product_variant_id);
                        productsToSave.push(this.flashSaleProductRepository.create({ ...productDto, flash_sale_id: id, product_variant_id: productDto.product_variant_id }) as FlashSaleProduct);
                    }
                } else {
                    if (newOrUpdatedProductVariantIds.has(productDto.product_variant_id)) {
                        throw new BadRequestException(`Biến thể sản phẩm ID ${productDto.product_variant_id} bị trùng lặp trong dữ liệu cập nhật.`);
                    }
                    newOrUpdatedProductVariantIds.add(productDto.product_variant_id);
                    productsToSave.push(this.flashSaleProductRepository.create({ ...productDto, flash_sale_id: id, product_variant_id: productDto.product_variant_id }) as FlashSaleProduct);
                }
            }

            productsToDeleteIds.push(...Array.from(existingProductIds));

            if (productsToDeleteIds.length > 0) {
                await this.flashSaleProductRepository.delete(productsToDeleteIds);
                this.logger.log(`Xóa ${productsToDeleteIds.length} sản phẩm khỏi Flash Sale ID ${id}.`);
            }
            if (productsToSave.length > 0) {
                await this.flashSaleProductRepository.save(productsToSave);
                this.logger.log(`Lưu/cập nhật ${productsToSave.length} sản phẩm cho Flash Sale ID ${id}.`);
            }

            updatedFlashSale.flashSaleProducts = await this.flashSaleProductRepository.find({ where: { flash_sale_id: id } });
        }

        this.logger.log(`Cập nhật Flash Sale ID ${id} thành công.`);
        return updatedFlashSale;
    }


    async deleteFlashSale(id: number): Promise<void> {
        const flashSale = await this.flashSaleRepository.findOne({ where: { id } });
        if (!flashSale) {
            throw new NotFoundException(`Flash Sale với ID ${id} không tìm thấy.`);
        }
        await this.flashSaleRepository.remove(flashSale);
        this.logger.log(`Xóa Flash Sale ID ${id} thành công.`);
    }

    async toggleFlashSaleActiveStatus(id: number, isActive: boolean): Promise<FlashSale> {
        const flashSale = await this.flashSaleRepository.findOne({ where: { id } });
        if (!flashSale) {
            throw new NotFoundException(`Flash Sale với ID ${id} không tìm thấy.`);
        }
        flashSale.is_active = isActive;
        const updatedFlashSale: FlashSale = await this.flashSaleRepository.save(flashSale);
        this.logger.log(`Cập nhật trạng thái Flash Sale ID ${id} thành ${isActive ? 'active' : 'inactive'}.`);
        return updatedFlashSale;
    }
}
