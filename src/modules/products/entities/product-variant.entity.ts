import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Product } from "./product.entity";
import { ProductVariantAttributeValue } from "./product-variant-attribute-value.entity";
import { CartItem } from "src/modules/cart/entities/cart-item.entity";
import { WishlistItem } from "src/modules/cart/entities/wishlist-item.entity";
import { OrderItem } from "src/modules/payment/entities/order-item.entity";
import { FlashSaleProduct } from "src/modules/promotions/entities/flash-sale-product.entity";
import { Media } from "src/modules/media/entities/media.entity";

@Entity('product_variants')
@Unique(['variantSku'])
export class ProductVariant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    productId: number;

    @ManyToOne(() => Product, (product) => product.variants)
    product: Product;

    @Column({ type: 'varchar', length: 100, nullable: false })
    variantSku: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    costPrice: number | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    sellingPrice: number;

    @Column({ type: 'int', nullable: false, default: 0 })
    stockQuantity: number;

    @Column({ type: 'bigint', nullable: true })
    variantImageMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.productVariants)
    @JoinColumn({ name: 'variantImageMediaId' })
    variantImageMedia: Media | null;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @OneToMany(
        () => ProductVariantAttributeValue,
        (pvav) => pvav.productVariant,
    )
    attributeValues: ProductVariantAttributeValue[];

    @OneToMany(() => CartItem, (item) => item.productVariant)
    cartItems: CartItem[];

    @OneToMany(() => WishlistItem, (item) => item.productVariant)
    wishlistItems: WishlistItem[];

    @OneToMany(() => OrderItem, (item) => item.productVariant)
    orderItems: OrderItem[];

    @OneToMany(() => FlashSaleProduct, (fsProduct) => fsProduct.productVariant)
    flashSaleEntries: FlashSaleProduct[];
}