import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { FlashSale } from './flash-sale.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';

@Entity('flash_sale_products')
@Unique(['flashSaleId', 'productVariantId'])
export class FlashSaleProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: false })
    flashSaleId: number;

    @ManyToOne(() => FlashSale, (flashSale) => flashSale.products)
    flashSale: FlashSale;

    @Column({ type: 'bigint', nullable: false })
    productVariantId: number;

    @ManyToOne(() => ProductVariant, (variant) => variant.flashSaleEntries)
    productVariant: ProductVariant;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    flashSalePrice: number;

    @Column({ type: 'int', nullable: false })
    quantityLimit: number;

    @Column({ type: 'int', default: 0 })
    quantitySold: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}