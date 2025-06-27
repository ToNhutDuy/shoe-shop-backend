import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';

import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { ProductVariantAttributeValue } from '../entities/product-variant-attribute-value.entity';
import { Attribute } from '../entities/attribute.entity';
import { CreateProductVariantDto, UpdateProductVariantDto, AddVariantAttributeValueDto } from '../schemas/product.schema';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { MediaService } from 'src/modules/media/media.service';


@Injectable()
export class ProductVariantService {
    constructor(
        @InjectRepository(ProductVariant)
        private readonly productVariantRepository: Repository<ProductVariant>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(AttributeValue)
        private readonly attributeValueRepository: Repository<AttributeValue>,
        @InjectRepository(ProductVariantAttributeValue)
        private readonly pvaRepository: Repository<ProductVariantAttributeValue>,
        private dataSource: DataSource,

        private readonly mediaService: MediaService,
    ) { }

    async createProductVariant(productId: number, createProductVariantDto: CreateProductVariantDto): Promise<ProductVariant> {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new NotFoundException(`Product with ID ${productId} not found.`);
        }

        const existingVariant = await this.productVariantRepository.findOneBy({ variant_sku: createProductVariantDto.variant_sku });
        if (existingVariant) {
            throw new BadRequestException(`Product variant with SKU "${createProductVariantDto.variant_sku}" already exists.`);
        }

        const attributeValueIdsToAssociate = createProductVariantDto.attributeValueIds || [];

        const { attributeValueIds, ...variantData } = createProductVariantDto;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const newVariant = queryRunner.manager.create(ProductVariant, {
                ...variantData,
                product: product,
            });
            const savedVariant = await queryRunner.manager.save(newVariant);

            if (attributeValueIdsToAssociate.length > 0) {
                await this.addOrUpdateVariantAttributeValue(savedVariant.id, { attributeValueIds: attributeValueIdsToAssociate });
            }

            await queryRunner.commitTransaction();

            return this.findProductVariantById(savedVariant.id);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findAllProductVariants(productId: number, query: PaginationQueryDto): Promise<PaginatedResponse<ProductVariant>> {
        const { current = 1, pageSize = 10 } = query;
        const skip = (current - 1) * pageSize;

        const productExists = await this.productRepository.exists({ where: { id: productId } });
        if (!productExists) {
            throw new NotFoundException(`Product with ID ${productId} not found.`);
        }

        const [variants, totalItems] = await this.productVariantRepository.findAndCount({
            where: { product: { id: productId } },
            skip: skip,
            take: pageSize,
            relations: [
                'product',
                'variantImage',
                'attributeValues',
                'attributeValues.attributeValue',
                'attributeValues.attributeValue.attribute'
            ],
            order: { created_at: 'ASC' },
        });

        const totalPages = Math.ceil(totalItems / pageSize);
        const meta: PaginatedResponse<any>['meta'] = {
            currentPage: current,
            itemCount: variants.length,
            itemsPerPage: pageSize,
            totalItems,
            totalPages,
            hasNextPage: current < totalPages,
            hasPreviousPage: current > 1,
        };

        return {
            data: variants,
            meta,
        };
    }

    async findProductVariantById(id: number): Promise<ProductVariant> {
        const variant = await this.productVariantRepository.findOne({
            where: { id },
            relations: [
                'product',
                'variantImage',
                'attributeValues',
                'attributeValues.attributeValue',
                'attributeValues.attributeValue.attribute'
            ],
        });
        if (!variant) {
            throw new NotFoundException(`Product Variant with ID ${id} not found.`);
        }
        return variant;
    }

    async updateProductVariant(id: number, updateProductVariantDto: UpdateProductVariantDto): Promise<ProductVariant> {
        const variant = await this.findProductVariantById(id);

        if (updateProductVariantDto.variant_sku && updateProductVariantDto.variant_sku !== variant.variant_sku) {
            const existingVariant = await this.productVariantRepository.findOneBy({ variant_sku: updateProductVariantDto.variant_sku });
            if (existingVariant && existingVariant.id !== id) {
                throw new BadRequestException(`Product variant with SKU "${updateProductVariantDto.variant_sku}" already exists.`);
            }
        }

        const attributeValueIdsToUpdate = updateProductVariantDto.attributeValueIds || [];

        const { attributeValueIds, ...variantData } = updateProductVariantDto;

        this.productVariantRepository.merge(variant, variantData);
        const updatedVariant = await this.productVariantRepository.save(variant);


        if (attributeValueIdsToUpdate.length > 0) {
            const existingPVAs = await this.pvaRepository.find({
                where: { product_variant_id: id },
                select: ['attribute_value_id']
            });

            const existingAttrValueIds = existingPVAs.map(pva => pva.attribute_value_id);

            const toRemove = existingAttrValueIds.filter(existingId => !attributeValueIdsToUpdate.includes(existingId));
            if (toRemove.length > 0) {
                await Promise.all(toRemove.map(attrValueId =>

                    this.removeVariantAttributeValue(id, attrValueId)
                ));
            }
        } else {
            await this.pvaRepository.delete({ product_variant_id: id });
        }


        if (attributeValueIdsToUpdate.length > 0) {
            await this.addOrUpdateVariantAttributeValue(id, { attributeValueIds: attributeValueIdsToUpdate });
        }

        return this.findProductVariantById(updatedVariant.id);
    }

    async deleteProductVariant(id: number): Promise<void> {
        const deletePVA = await this.pvaRepository.delete({ product_variant_id: id });
        console.log(`Deleted ${deletePVA.affected} associated ProductVariantAttributeValue entries for variant ${id}.`);

        const result = await this.productVariantRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Product Variant with ID ${id} not found.`);
        }
    }

    async addOrUpdateVariantAttributeValue(variantId: number, addVariantAttributeValueDto: AddVariantAttributeValueDto): Promise<ProductVariantAttributeValue[]> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const variant = await queryRunner.manager.findOneBy(ProductVariant, { id: variantId });
            if (!variant) {
                throw new NotFoundException(`Product Variant with ID ${variantId} not found.`);
            }

            const attributeValues = await queryRunner.manager.find(AttributeValue, {
                where: { id: In(addVariantAttributeValueDto.attributeValueIds) },
                relations: ['attribute']
            });

            if (attributeValues.length !== addVariantAttributeValueDto.attributeValueIds.length) {
                const foundIds = new Set(attributeValues.map(av => av.id));
                const missingIds = addVariantAttributeValueDto.attributeValueIds.filter(id => !foundIds.has(id));
                throw new BadRequestException(`One or more attribute value IDs are invalid or not found: ${missingIds.join(', ')}`);
            }

            const pvaEntriesToSave: ProductVariantAttributeValue[] = [];
            const newAttributeTypes: Set<number> = new Set();
            const currentAttributeTypesForVariant: Set<number> = new Set();

            const existingPVAForVariant = await queryRunner.manager.find(ProductVariantAttributeValue, {
                where: { product_variant_id: variantId },
                relations: ['attributeValue', 'attributeValue.attribute']
            });

            for (const existingPVA of existingPVAForVariant) {
                if (existingPVA.attributeValue?.attribute?.id) {
                    currentAttributeTypesForVariant.add(existingPVA.attributeValue.attribute.id);
                }
            }

            for (const attrValue of attributeValues) {
                if (!attrValue.attribute) {
                    throw new BadRequestException(`Attribute value ID ${attrValue.id} is not linked to an attribute.`);
                }

                const existingPVAForThisAttributeType = existingPVAForVariant.find(pva =>
                    pva.attributeValue?.attribute?.id === attrValue.attribute.id
                );

                if (existingPVAForThisAttributeType) {
                    if (existingPVAForThisAttributeType.attribute_value_id !== attrValue.id) {
                        throw new BadRequestException(
                            `Product variant ${variantId} already has an attribute value for attribute type "${attrValue.attribute.name}" (currently "${existingPVAForThisAttributeType.attributeValue?.value}"). Cannot add another value for the same attribute type without replacing.`
                        );
                    } else {
                        continue;
                    }
                }

                if (newAttributeTypes.has(attrValue.attribute.id)) {
                    throw new BadRequestException(
                        `Duplicate attribute type "${attrValue.attribute.name}" found in the request for Product variant ${variantId}.`
                    );
                }

                const newPVA = queryRunner.manager.create(ProductVariantAttributeValue, {
                    product_variant: variant,
                    attribute_value: attrValue,
                    product_variant_id: variantId,
                    attribute_value_id: attrValue.id,
                });
                pvaEntriesToSave.push(newPVA);
                newAttributeTypes.add(attrValue.attribute.id);
            }

            const savedPVAs = await queryRunner.manager.save(pvaEntriesToSave);

            await queryRunner.commitTransaction();
            return savedPVAs;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAttributeValuesByVariantId(variantId: number): Promise<ProductVariantAttributeValue[]> {
        const variantExists = await this.productVariantRepository.exists({ where: { id: variantId } });
        if (!variantExists) {
            throw new NotFoundException(`Product Variant with ID ${variantId} not found.`);
        }
        return this.pvaRepository.find({
            where: { product_variant_id: variantId },
            relations: ['attributeValue', 'attributeValue.attribute'],
        });
    }

    async removeVariantAttributeValue(variantId: number, attributeValueId: number): Promise<void> {
        const variantExists = await this.productVariantRepository.exists({ where: { id: variantId } });
        if (!variantExists) {
            throw new NotFoundException(`Product Variant with ID ${variantId} not found.`);
        }
        const attributeValueExists = await this.attributeValueRepository.exists({ where: { id: attributeValueId } });
        if (!attributeValueExists) {
            throw new NotFoundException(`Attribute Value with ID ${attributeValueId} not found.`);
        }

        const result = await this.pvaRepository.delete({
            product_variant_id: variantId,
            attribute_value_id: attributeValueId,
        });
        if (result.affected === 0) {
            throw new NotFoundException(`Attribute Value ${attributeValueId} not linked to Variant ${variantId}.`);
        }
    }

    async updateImageVariant(brandId: number, mediaId: number): Promise<ProductVariant> {
        const variant = await this.productVariantRepository.findOne({ where: { id: brandId } });
        if (!variant) {
            throw new NotFoundException(`Brand with ID ${brandId} not found.`);
        }

        const media = await this.mediaService.findOneMedia(mediaId);
        if (!media) {
            throw new NotFoundException(`Media with ID ${mediaId} not found.`);
        }

        variant.variant_image_media_id = mediaId;
        return this.productVariantRepository.save(variant);
    }
}