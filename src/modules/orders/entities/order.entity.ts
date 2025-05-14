import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Unique,
} from 'typeorm';

import { Address } from 'src/modules/users/entities/address.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { ShippingProvider } from './shipping-provider.entity';
import { PaymentMethod } from 'src/modules/payment/entities/payment-method.entity';
import { OrderStatusCode, OrderStatusHistory } from './order-status-history.entity';
import { OrderItem } from 'src/modules/payment/entities/order-item.entity';
import { OrderPayment } from 'src/modules/payment/entities/order-payment.entity';
import { OrderPromotion } from 'src/modules/promotions/entities/order-promotion.entity';
import { ProductReview } from 'src/modules/products/entities/product-review.entity';

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

const decimalTransformer = {
    to: (value: number) => value,
    from: (value: string): number => parseFloat(value),
};

@Entity('orders')
@Unique(['orderCode'])
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    orderCode: string;

    @Column({ type: 'bigint', nullable: true })
    userId: number | null;

    @ManyToOne(() => User, (user) => user.orders, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column({ type: 'varchar', length: 255, nullable: false })
    customerEmail: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    customerFullName: string;

    @Column({ type: 'varchar', length: 20, nullable: false })
    customerPhoneNumber: string;

    @Column({ type: 'bigint', nullable: true })
    shippingAddressId: number | null;

    @ManyToOne(() => Address, (address) => address.orders, { nullable: true })
    @JoinColumn({ name: 'shippingAddressId' })
    shippingAddress: Address | null;

    @Column({ type: 'text', nullable: false })
    shippingAddressSnapshotText: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, transformer: decimalTransformer, nullable: false })
    subtotalAmount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: decimalTransformer })
    discountAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer })
    shippingFeeAmount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, transformer: decimalTransformer, nullable: false })
    grandTotalAmount: number;

    @Column({ type: 'int', nullable: false })
    paymentMethodId: number;

    @ManyToOne(() => PaymentMethod, (method) => method.orders)
    @JoinColumn({ name: 'paymentMethodId' })
    paymentMethod: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        nullable: false,
        default: PaymentStatus.PENDING,
    })
    paymentStatus: PaymentStatus;

    @Column({
        type: 'enum',
        enum: OrderStatusCode,
        nullable: false,
        default: OrderStatusCode.PENDING_CONFIRMATION,
    })
    orderStatusCode: OrderStatusCode;

    @Column({ type: 'text', nullable: true })
    customerNotes: string | null;

    @Column({ type: 'text', nullable: true })
    internalNotes: string | null;

    @Column({ type: 'int', nullable: true })
    shippingProviderId: number | null;

    @ManyToOne(() => ShippingProvider, (provider) => provider.orders, { nullable: true })
    @JoinColumn({ name: 'shippingProviderId' })
    shippingProvider: ShippingProvider | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    trackingNumber: string | null;

    @Column({ type: 'date', nullable: true })
    estimatedDeliveryDate: Date | null;

    @Column({ type: 'datetime', nullable: false })
    placedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => OrderStatusHistory, (history) => history.order)
    statusHistory: OrderStatusHistory[];

    @OneToMany(() => OrderItem, (item) => item.order)
    items: OrderItem[];

    @OneToMany(() => OrderPayment, (payment) => payment.order)
    payments: OrderPayment[];

    @OneToMany(() => OrderPromotion, (orderPromotion) => orderPromotion.order)
    promotions: OrderPromotion[];

    @OneToMany(() => ProductReview, (review) => review.order)
    productReviews: ProductReview[];
}
