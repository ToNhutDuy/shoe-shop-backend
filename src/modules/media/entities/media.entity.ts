import { Banner } from 'src/modules/banners/entities/banner.entity';
import { BlogPost } from 'src/modules/blogs/entities/blog-post.entity';
import { ShippingProvider } from 'src/modules/orders/entities/shipping-provider.entity';
import { PaymentMethod } from 'src/modules/payments/entities/payment-method.entity';
import { Brand } from 'src/modules/products/entities/brand.entity';
import { ProductCategory } from 'src/modules/products/entities/product-category.entity';
import { ProductGalleryMedia } from 'src/modules/products/entities/product-gallery-media.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { FlashSale } from 'src/modules/promotions/entities/flash-sale.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Unique,
} from 'typeorm';


@Entity('media')
@Unique(['stored_file_name']) // <-- Sửa lỗi ở đây!
export class Media {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    original_file_name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    stored_file_name: string; // Tên cột đúng

    @Column({ type: 'varchar', length: 255, nullable: false })
    relative_path: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    mime_type: string | null;

    @Column({ type: 'bigint', nullable: true })
    file_size_bytes: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    default_alt_text: string | null;

    @Column({ type: 'enum', enum: ['image', 'video', 'document', 'other'], default: 'other' })
    file_type: 'image' | 'video' | 'document' | 'other';

    @Column({ type: 'varchar', length: 255, nullable: true })
    thumbnail_path: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    medium_path: string;

    @Column({ type: 'bigint', nullable: true })
    uploaded_by_user_id: number | null;

    @ManyToOne(() => User, (user) => user.uploadedMedia)
    @JoinColumn({ name: 'uploaded_by_user_id' })
    uploadedBy: User | null;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updated_at: Date;

    // ... các quan hệ OneToMany khác
    @OneToMany(() => User, (user) => user.profilePictureMedia)
    users: User[];

    @OneToMany(() => ProductCategory, (category) => category.coverImageMedia)
    productCategories: ProductCategory[];

    @OneToMany(() => Brand, (brand) => brand.logoMedia)
    brands: Brand[];

    @OneToMany(() => Product, (product) => product.mainCoverImageMedia)
    products: Product[];

    @OneToMany(() => ProductVariant, (variant) => variant.variantImageMedia)
    productVariants: ProductVariant[];

    @OneToMany(() => ProductGalleryMedia, (gallery) => gallery.media)
    productGalleryEntries: ProductGalleryMedia[];

    @OneToMany(() => ShippingProvider, (provider) => provider.logoMedia)
    shippingProviders: ShippingProvider[];

    @OneToMany(() => PaymentMethod, (method) => method.logoMedia)
    paymentMethods: PaymentMethod[];

    @OneToMany(() => FlashSale, (flashSale) => flashSale.bannerMedia)
    flashSales: FlashSale[];

    @OneToMany(() => BlogPost, (blogPost) => blogPost.featuredImageMedia)
    blogPosts: BlogPost[];

    @OneToMany(() => Banner, (banner) => banner.media)
    banners: Banner[];
}