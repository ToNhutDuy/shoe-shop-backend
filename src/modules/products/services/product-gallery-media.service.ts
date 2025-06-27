// src/product/services/product-gallery-media.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ProductGalleryMedia } from '../entities/product-gallery-media.entity';

import { Product } from '../entities/product.entity';
import { Media } from '../../media/entities/media.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { AddGalleryImagesToProductDto, UpdateProductGalleryMediaDto } from '../schemas/product.schema';
import { join } from 'path';
import * as fs from 'fs-extra';

@Injectable()
export class ProductGalleryMediaService {

    private readonly logger = new Logger(ProductGalleryMediaService.name);

    constructor(

        @InjectRepository(ProductGalleryMedia)
        private readonly productGalleryMediaRepository: Repository<ProductGalleryMedia>,

        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,

        @InjectRepository(Media)
        private readonly mediaRepository: Repository<Media>,
        private dataSource: DataSource,
    ) { }


    async addImagesToProductGallery(
        productId: number,
        galleryImagesDto: AddGalleryImagesToProductDto,
    ): Promise<ProductGalleryMedia[]> {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new NotFoundException(`Sản phẩm với ID ${productId} không tìm thấy.`);
        }
        if (!galleryImagesDto || galleryImagesDto.length === 0) {
            throw new BadRequestException('Không có ảnh thư viện nào được cung cấp.');
        }

        const mediaIds = galleryImagesDto.map(dto => dto.mediaId);
        const existingMedia = await this.mediaRepository.findBy({ id: In(mediaIds) });
        if (existingMedia.length !== mediaIds.length) {
            const foundIds = existingMedia.map(m => m.id);
            const missingIds = mediaIds.filter(id => !foundIds.includes(id));
            throw new BadRequestException(`Một hoặc nhiều tệp phương tiện không tìm thấy: ${missingIds.join(', ')}`);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const galleryEntriesToCreate: ProductGalleryMedia[] = [];
            const maxOrderResult = await queryRunner.manager
                .createQueryBuilder(ProductGalleryMedia, 'pgm')
                .where('pgm.productId = :productId', { productId })
                .select('MAX(pgm.display_order)', 'maxOrder')
                .getRawOne();

            let maxDisplayOrder = maxOrderResult?.maxOrder || -1;

            for (const dto of galleryImagesDto) {
                const existingEntry = await queryRunner.manager.findOne(ProductGalleryMedia, {
                    where: {
                        product: { id: productId },
                        mediaId: dto.mediaId
                    }
                });

                if (existingEntry) {
                    this.logger.warn(`Media ID ${dto.mediaId} đã tồn tại trong thư viện cho Sản phẩm ID ${productId}. Bỏ qua.`);
                    continue;
                }

                maxDisplayOrder++;


                const newEntry = new ProductGalleryMedia();
                newEntry.product = { id: productId } as Product;
                newEntry.mediaId = dto.mediaId;

                newEntry.altText = dto.altText ?? null;
                newEntry.display_order = dto.displayOrder ?? maxDisplayOrder;

                galleryEntriesToCreate.push(newEntry);
            }

            if (galleryEntriesToCreate.length === 0) {
                throw new BadRequestException('Không có ảnh thư viện mới độc đáo nào để thêm.');
            }

            const savedEntries = await queryRunner.manager.save(galleryEntriesToCreate);
            await queryRunner.commitTransaction();
            return savedEntries;
        } catch (error) {
            await queryRunner.rollbackTransaction();

            this.logger.error(`Thêm ảnh vào thư viện sản phẩm cho sản phẩm ${productId} thất bại: ${error.message}`, error.stack);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findProductImagesByProductId(
        productId: number,
        query: PaginationQueryDto,
    ): Promise<PaginatedResponse<ProductGalleryMedia & { media: (Media & { full_url: string }) | null }>> {
        const page = query.current ?? 1;
        const limit = query.pageSize ?? 10;
        const search = query.search;

        const offset = (page - 1) * limit;

        const queryBuilder = this.productGalleryMediaRepository.createQueryBuilder('pgm')
            .where('pgm.productId = :productId', { productId })
            .leftJoinAndSelect('pgm.media', 'media')
            .orderBy('pgm.display_order', 'ASC');


        if (search) {
            queryBuilder.andWhere('LOWER(pgm.altText) LIKE LOWER(:search)', { search: `%${search}%` });
        }

        const [results, totalItems] = await queryBuilder
            .take(limit)
            .skip(offset)
            .getManyAndCount();

        const enrichedResults = results.map(item => ({
            ...item,
            media: item.media ? {
                ...item.media,
                full_url: `/media/stream/${item.media.id}`
            } : null
        }));

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;
        const itemCount = results.length;

        return {
            data: enrichedResults,
            meta: {
                currentPage: page,
                itemCount: itemCount,
                itemsPerPage: limit,
                totalItems: totalItems,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPreviousPage: hasPreviousPage,
            },
        };
    }


    async findProductGalleryMediaById(id: number): Promise<ProductGalleryMedia> {
        const galleryImage = await this.productGalleryMediaRepository.findOne({
            where: { id },
            relations: ['media'],
        });
        if (!galleryImage) {
            throw new NotFoundException(`Ảnh thư viện sản phẩm với ID ${id} không tìm thấy.`);
        }

        if (galleryImage.media) {

            (galleryImage.media as any).full_url = `/media/stream/${galleryImage.media.id}`;
        }
        return galleryImage;
    }



    async updateProductGalleryMedia(
        id: number,
        updateDto: UpdateProductGalleryMediaDto,
    ): Promise<ProductGalleryMedia> {
        const galleryImage = await this.productGalleryMediaRepository.findOneBy({ id }); // Tìm ảnh theo ID
        if (!galleryImage) {
            throw new NotFoundException(`Ảnh thư viện sản phẩm với ID ${id} không tìm thấy.`);
        }


        galleryImage.altText = updateDto.altText === undefined ? galleryImage.altText : updateDto.altText;

        galleryImage.display_order = updateDto.displayOrder === undefined ? galleryImage.display_order : updateDto.displayOrder;

        return this.productGalleryMediaRepository.save(galleryImage); // Lưu entity đã cập nhật
    }


    async removeProductGalleryMedia(id: number): Promise<void> {
        const media = await this.productGalleryMediaRepository.findOneBy({ id });
        if (!media) {
            throw new NotFoundException(`Không tìm thấy ảnh thư viện với ID ${id}.`);
        }

        const result = await this.productGalleryMediaRepository.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException(`Không tìm thấy ảnh thư viện với ID ${id} để xóa.`);
        }


        if (media.mediaId) {
            const filePath = join(process.cwd(), 'uploads', 'products', media.mediaId.toString());
            try {
                await fs.remove(filePath);
                console.log(`Đã xóa file: ${filePath}`);
            } catch (error) {
                console.error(`Không thể xóa file ${filePath}:`, error);

            }
        }
    }


    // async reorderProductImages(
    //     productId: number,
    //     orderUpdates: { id: number; displayOrder: number }[],
    // ): Promise<ProductGalleryMedia[]> {
    //     if (!orderUpdates || orderUpdates.length === 0) {
    //         throw new BadRequestException('Không có cập nhật thứ tự nào được cung cấp.');
    //     }

    //     const queryRunner = this.dataSource.createQueryRunner();
    //     await queryRunner.connect();
    //     await queryRunner.startTransaction();

    //     try {
    //         const updatedImages: ProductGalleryMedia[] = []; 
    //         for (const update of orderUpdates) {
    //             // Tìm ảnh thư viện bằng ID và đảm bảo nó thuộc về sản phẩm đã cho
    //             const galleryImage = await queryRunner.manager.findOne(ProductGalleryMedia, {
    //                 where: {
    //                     id: update.id,
    //                     product: { id: productId } // Đảm bảo ảnh thuộc về đúng sản phẩm
    //                 }
    //             });

    //             if (!galleryImage) {
    //                 throw new NotFoundException(`Ảnh thư viện với ID ${update.id} không tìm thấy cho sản phẩm ${productId}.`);
    //             }

    //             galleryImage.display_order = update.displayOrder; // Cập nhật thứ tự hiển thị
    //             await queryRunner.manager.save(galleryImage); // Lưu thay đổi
    //             updatedImages.push(galleryImage); // Thêm vào mảng kết quả
    //         }
    //         await queryRunner.commitTransaction(); // Xác nhận giao dịch
    //         return updatedImages; // Trả về các ảnh đã được cập nhật
    //     } catch (error) {
    //         await queryRunner.rollbackTransaction(); // Hoàn tác giao dịch nếu có lỗi
    //         // Ghi lỗi và stack trace
    //         this.logger.error(`Sắp xếp lại thứ tự ảnh thư viện cho sản phẩm ${productId} thất bại: ${error.message}`, error.stack);
    //         throw error; // Ném lại lỗi
    //     } finally {
    //         await queryRunner.release(); 
    //     }
    // }



    async reorderProductImages(
        productId: number,
        orderUpdates: { id: number; displayOrder: number }[],
    ): Promise<ProductGalleryMedia[]> {
        const updatedImages: ProductGalleryMedia[] = [];
        for (const update of orderUpdates) {
            const image = await this.productGalleryMediaRepository.findOne({ where: { id: update.id, product: { id: productId } } });
            if (image) {
                image.display_order = update.displayOrder;
                updatedImages.push(await this.productGalleryMediaRepository.save(image));
            }
        }
        return updatedImages;
    }
}