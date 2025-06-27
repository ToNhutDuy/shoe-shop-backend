// src/product/entities/product-variant.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { Media } from '../../media/entities/media.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
import { CartItem } from 'src/modules/carts/entities/cart-item.entity';
import { WishlistItem } from 'src/modules/carts/entities/wishlist-item.entity';
import { OrderItem } from 'src/modules/payments/entities/order-item.entity';
import { FlashSaleProduct } from 'src/modules/promotions/entities/flash-sale-product.entity';


@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    product_id: number;

    @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    variant_sku: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    cost_price: number | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    selling_price: number;

    @Column({ type: 'int', default: 0, nullable: false })
    stock_quantity: number;

    @Column({ type: 'bigint', nullable: true })
    variant_image_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'variant_image_media_id' })
    variantImage: Media;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => ProductVariantAttributeValue, (pvav) => pvav.productVariant)
    attributeValues: ProductVariantAttributeValue[];

    @OneToMany(() => CartItem, (cartItem) => cartItem.productVariant)
    cartItems: CartItem[];

    @OneToMany(() => WishlistItem, (wishlistItem) => wishlistItem.productVariant)
    wishlistItems: WishlistItem[];

    @OneToMany(() => OrderItem, (orderItem) => orderItem.productVariant)
    orderItems: OrderItem[];

    @OneToMany(() => FlashSaleProduct, (flashSaleProduct) => flashSaleProduct.productVariant)
    flashSaleProducts: FlashSaleProduct[];
}