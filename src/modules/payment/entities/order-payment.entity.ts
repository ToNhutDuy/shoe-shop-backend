import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';

import { Order, PaymentStatus } from '../../orders/entities/order.entity';
import { PaymentMethod } from './payment-method.entity';

@Entity('order_payments')
export class OrderPayment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    orderId: number;

    @ManyToOne(() => Order, (order) => order.payments)
    order: Order;

    @Column({ type: 'int', nullable: false })
    paymentMethodId: number;

    @ManyToOne(() => PaymentMethod, (method) => method.orderPayments)
    paymentMethod: PaymentMethod;

    @Column({ type: 'varchar', length: 255, nullable: true })
    externalTransactionId: string | null;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    amountPaid: number;

    @Column({ type: 'datetime', nullable: false })
    paymentTimestamp: Date;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        enum: PaymentStatus,
    })
    status: PaymentStatus;

    @Column({ type: 'json', nullable: true })
    gatewayResponseDetails: object | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}