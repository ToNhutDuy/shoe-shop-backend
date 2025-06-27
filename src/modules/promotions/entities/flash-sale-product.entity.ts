// src/promotion/entities/flash-sale-product.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Unique, PrimaryGeneratedColumn } from 'typeorm';
import { FlashSale } from './flash-sale.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';


@Entity('flash_sale_products')
@Unique(['flash_sale_id', 'product_variant_id'])
export class FlashSaleProduct {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'int', nullable: false })
    flash_sale_id: number;

    @ManyToOne(() => FlashSale, (flashSale) => flashSale.flashSaleProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'flash_sale_id' })
    flashSale: FlashSale;

    @Column({ type: 'bigint', nullable: false })
    product_variant_id: number;

    @ManyToOne(() => ProductVariant, (productVariant) => productVariant.flashSaleProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_variant_id' })
    productVariant: ProductVariant;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    flash_sale_price: number;

    @Column({ type: 'int', nullable: false })
    quantity_limit: number;

    @Column({ type: 'int', default: 0, nullable: false })
    quantity_sold: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}