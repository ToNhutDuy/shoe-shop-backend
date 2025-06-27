// src/payment/entities/order-payment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

import { PaymentMethod } from './payment-method.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

@Entity('order_payments')
export class OrderPayment {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'bigint', nullable: false })
    order_id: number;

    @ManyToOne(() => Order, (order) => order.orderPayments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'int', nullable: false })
    payment_method_id: number;

    @ManyToOne(() => PaymentMethod, (paymentMethod) => paymentMethod.orderPayments, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'payment_method_id' })
    paymentMethod: PaymentMethod;

    @Column({ type: 'varchar', length: 255, nullable: true })
    external_transaction_id: string | null;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    amount_paid: number;

    @Column({ type: 'datetime', nullable: false })
    payment_timestamp: Date;

    @Column({ type: 'varchar', length: 50, nullable: false })
    status: string;

    @Column({ type: 'json', nullable: true })
    gateway_response_details: object | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}