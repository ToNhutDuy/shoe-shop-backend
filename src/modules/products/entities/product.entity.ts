import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ProductCategory } from "./product-category.entity";
import { Brand } from "./brand.entity";
import { ProductVariant } from "./product-variant.entity";
import { ProductGalleryMedia } from "./product-gallery-media.entity";
import { ProductReview } from "./product-review.entity";
import { Media } from "src/modules/media/entities/media.entity";

export enum ProductStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    UNPUBLISHED = 'unpublished',
}

@Entity('products')
@Unique(['slug'])
@Unique(['baseSku'])
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    baseSku: string;

    @Column({ type: 'text', nullable: true })
    shortDescription: string | null;

    @Column({ type: 'text', nullable: true })
    longDescription: string | null;

    @Column({ type: 'int', nullable: false })
    categoryId: number;

    @ManyToOne(() => ProductCategory, (category) => category.products)
    category: ProductCategory;

    @Column({ type: 'int', nullable: true })
    brandId: number | null;

    @ManyToOne(() => Brand, (brand) => brand.products)
    brand: Brand | null;

    @Column({ type: 'bigint', nullable: true })
    mainCoverImageMediaId: number | null; // Cột khóa ngoại

    @ManyToOne(() => Media, (media) => media.products, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'mainCoverImageMediaId' })
    mainCoverImageMedia: Media | null;
    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
    averageRating: number;

    @Column({ type: 'int', default: 0 })
    reviewCount: number;

    @Column({
        type: 'enum',
        nullable: false,
        default: ProductStatus.DRAFT,
        enum: ProductStatus,
    })
    status: ProductStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => ProductVariant, (variant) => variant.product)
    variants: ProductVariant[];

    @OneToMany(() => ProductGalleryMedia, (gallery) => gallery.product)
    productGalleryEntries: ProductGalleryMedia[];

    @OneToMany(() => ProductReview, (review) => review.product)
    reviews: ProductReview[];
}