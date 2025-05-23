import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    orderId: number;

    @ManyToOne(() => Order, (order) => order.items)
    order: Order;

    @Column({ type: 'bigint', nullable: false })
    productVariantId: number;

    @ManyToOne(() => ProductVariant, (variant) => variant.orderItems)
    productVariant: ProductVariant;

    @Column({ type: 'varchar', length: 255, nullable: false })
    productNameSnapshot: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    variantSkuSnapshot: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
    unitPriceAtPurchase: number;

    @Column({ type: 'int', nullable: false })
    quantity: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    lineItemTotalAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    lineItemDiscountAmount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}