import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { Brand } from './brand.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductGalleryMedia } from './product-gallery-media.entity';
import { ProductReview } from './product-review.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    base_sku: string;

    @Column({ type: 'text', nullable: true })
    short_description: string;

    @Column({ type: 'text', nullable: true })
    long_description: string;

    @ManyToOne(() => ProductCategory, category => category.products)
    @JoinColumn({ name: 'category_id' })
    category: ProductCategory;

    @Column({ type: 'int', nullable: false })
    category_id: number;

    @ManyToOne(() => Brand, brand => brand.products)
    @JoinColumn({ name: 'brand_id' })
    brand: Brand;

    @Column({ type: 'int', nullable: true })
    brand_id: number;

    @Column({ type: 'bigint', nullable: true })
    main_cover_image_media_id: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.00, nullable: false })
    average_rating: number;

    @Column({ type: 'int', default: 0, nullable: false })
    review_count: number;

    @Column({ type: 'varchar', length: 50, default: 'published', nullable: false })
    status: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
    @OneToMany(() => ProductVariant, variant => variant.product)
    variants: ProductVariant[];

    @OneToMany(() => ProductGalleryMedia, galleryImages => galleryImages.product)
    galleryMedia: ProductGalleryMedia[];

    @OneToMany(() => ProductReview, review => review.product)
    reviews: ProductReview[];
}