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
@Unique(['storedFileName'])
export class Media {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    originalFileName: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    storedFileName: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    relativePath: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    mimeType: string | null;

    @Column({ type: 'int', nullable: true })
    fileSizeBytes: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    defaultAltText: string | null;

    @Column({ type: 'bigint', nullable: true })
    uploadedByUserId: number | null;

    @ManyToOne(() => User, (user) => user.uploadedMedia)
    @JoinColumn({ name: 'uploadedByUserId' })
    uploadedBy: User | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;


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