// src/order/entities/order.entity.ts
import { PaymentMethod } from 'src/modules/payments/entities/payment-method.entity';
import { Address } from 'src/modules/users/entities/address.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Unique,
} from 'typeorm';
import { ShippingProvider } from './shipping-provider.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderPayment } from 'src/modules/payments/entities/order-payment.entity';
import { OrderItem } from 'src/modules/payments/entities/order-item.entity';
import { ProductReview } from 'src/modules/products/entities/product-review.entity';
import { OrderPromotion } from 'src/modules/promotions/entities/order-promotion.entity';


@Entity('orders')
@Unique(['order_code'])
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    order_code: string;

    @Column({ type: 'bigint', nullable: true })
    user_id: number | null;

    @ManyToOne(() => User, (user) => user.orders, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    customer_email: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    customer_full_name: string;

    @Column({ type: 'varchar', length: 20, nullable: false })
    customer_phone_number: string;

    @Column({ type: 'bigint', nullable: true })
    shipping_address_id: number | null;

    @ManyToOne(() => Address, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'shipping_address_id' })
    shippingAddress: Address;

    @Column({ type: 'text', nullable: false })
    shipping_address_snapshot_text: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    subtotal_amount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, nullable: false })
    discount_amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
    shipping_fee_amount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    grand_total_amount: number;

    @Column({ type: 'int', nullable: false })
    payment_method_id: number;

    @ManyToOne(() => PaymentMethod, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'payment_method_id' })
    paymentMethod: PaymentMethod;

    @Column({ type: 'varchar', length: 50, default: 'pending', nullable: false })
    payment_status: string;

    @Column({ type: 'varchar', length: 50, default: 'pending_confirmation', nullable: false })
    order_status_code: string;

    @Column({ type: 'text', nullable: true })
    customer_notes: string | null;

    @Column({ type: 'text', nullable: true })
    internal_notes: string | null;

    @Column({ type: 'int', nullable: true })
    shipping_provider_id: number | null;

    @ManyToOne(() => ShippingProvider, (provider) => provider.orders, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'shipping_provider_id' })
    shippingProvider: ShippingProvider;

    @Column({ type: 'varchar', length: 100, nullable: true })
    tracking_number: string | null;

    @Column({ type: 'date', nullable: true })
    estimated_delivery_date: Date | null;

    @Column({ type: 'datetime', nullable: false })
    placed_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => OrderStatusHistory, (history) => history.order)
    statusHistory: OrderStatusHistory[];

    @OneToMany(() => OrderPayment, (orderPayment) => orderPayment.order)
    orderPayments: OrderPayment[];

    @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
    orderItems: OrderItem[];

    @OneToMany(() => ProductReview, (review) => review.order)
    productReviews: ProductReview[];

    @OneToMany(() => OrderPromotion, (orderPromotion) => orderPromotion.order)
    orderPromotions: OrderPromotion[];
}