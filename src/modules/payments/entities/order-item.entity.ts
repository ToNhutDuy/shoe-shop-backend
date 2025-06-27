import { Order } from 'src/modules/orders/entities/order.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';

@Entity('order_items')
@Unique(['order_id', 'product_variant_id'])
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    order_id: number;

    @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'bigint', nullable: false })
    product_variant_id: number;

    @ManyToOne(() => ProductVariant, (productVariant) => productVariant.orderItems, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'product_variant_id' })
    productVariant: ProductVariant;

    @Column({ type: 'varchar', length: 255, nullable: false })
    product_name_snapshot: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    variant_sku_snapshot: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    unit_price_at_purchase: number;

    @Column({ type: 'int', nullable: false })
    quantity: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    line_item_total_amount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, nullable: false })
    line_item_discount_amount: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}
