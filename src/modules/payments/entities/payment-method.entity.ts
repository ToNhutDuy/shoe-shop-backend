// src/payment/entities/payment-method.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Media } from '../../media/entities/media.entity';

import { OrderPayment } from './order-payment.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

@Entity('payment_methods')
export class PaymentMethod {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
    code: string;

    @Column({ type: 'bigint', nullable: true })
    logo_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'logo_media_id' })
    logo: Media;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'json', nullable: true }) // Using JSON type for API configuration
    api_configuration: object | null;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => Order, (order) => order.paymentMethod)
    orders: Order[];

    @OneToMany(() => OrderPayment, (orderPayment) => orderPayment.paymentMethod)
    orderPayments: OrderPayment[];
}