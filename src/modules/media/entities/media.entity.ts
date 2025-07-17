// src/media/entities/media.entity.ts
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique, DeleteDateColumn } from 'typeorm';
import { MediaFolder } from './media-folder.entity';
import { ProductCategory } from 'src/modules/products/entities/product-category.entity';
import { Brand } from 'src/modules/products/entities/brand.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { ShippingProvider } from 'src/modules/orders/entities/shipping-provider.entity';
import { PaymentMethod } from 'src/modules/payments/entities/payment-method.entity';
import { FlashSale } from 'src/modules/promotions/entities/flash-sale.entity';
import { BlogPost } from 'src/modules/blogs/entities/blog-post.entity';
import { Banner } from 'src/modules/banners/entities/banner.entity';


// Định nghĩa các Enums từ schema hoặc riêng biệt
export enum FileType {
    IMAGE = 'image',
    VIDEO = 'video',
    DOCUMENT = 'document',
    OTHER = 'other',

}

export enum MediaPurpose {
    PRODUCT_IMAGE = 'product_image',
    BANNER = 'banner',
    LOGO = 'logo',
    BLOG_IMAGE = 'blog_image',
    OTHER = 'other',
    CATEGORY_COVER = 'category_cover',
    PRODUCT_VARIANT_IMAGE = 'variant_image'
}



@Entity('media')
@Unique(['stored_file_name'])
export class Media {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    original_file_name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    stored_file_name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    relative_path: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    mime_type: string | null;

    @Column({ type: 'bigint', nullable: true })
    file_size_bytes: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    default_alt_text: string | null;

    @Column({ type: 'enum', enum: FileType, nullable: false }) // Sử dụng enum FileType
    file_type: FileType;

    @Column({ type: 'enum', enum: MediaPurpose, default: MediaPurpose.OTHER, nullable: false }) // Sử dụng enum MediaPurpose
    purpose: MediaPurpose;

    @Column({ type: 'json', nullable: true })
    variations: object | null;

    @Column({ type: 'bigint', nullable: true })
    uploaded_by_user_id: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'uploaded_by_user_id' })
    uploadedBy: User;

    @Column({ type: 'bigint', nullable: true })
    parent_folder_id: number | null;

    @ManyToOne(() => MediaFolder, (folder) => folder.media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parent_folder_id' })
    parentFolder: MediaFolder;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' }) // Thêm cột deleted_at
    deleted_at: Date | null;

    // Transient property for full_url (not stored in DB)
    full_url?: string; // Để tiện lợi khi trả về từ service full_url?: string; // Để tiện lợi khi trả về từ service
    thumbnail_url?: string; // Thêm thumbnail_url làm thuộc tính tạm thời
    medium_url?: string; // Thêm medium_url làm thuộc tính tạm thời

    @OneToMany(() => ProductCategory, (category) => category.coverImage)
    productCategories: ProductCategory[];

    @OneToMany(() => Brand, (brand) => brand.logo)
    brands: Brand[];

    @OneToMany(() => Product, (product) => product.product_image)
    products: Product[];

    @OneToMany(() => ProductVariant, (variant) => variant.variant_image)
    productVariants: ProductVariant[];


    @OneToMany(() => ShippingProvider, (provider) => provider.logo)
    shippingProviders: ShippingProvider[];

    @OneToMany(() => PaymentMethod, (method) => method.logo)
    paymentMethods: PaymentMethod[];

    @OneToMany(() => FlashSale, (flashSale) => flashSale.banner)
    flashSales: FlashSale[];

    @OneToMany(() => BlogPost, (blogPost) => blogPost.featuredImage)
    blogPosts: BlogPost[];

    @OneToMany(() => Banner, (banner) => banner.media)
    banners: Banner[];


}