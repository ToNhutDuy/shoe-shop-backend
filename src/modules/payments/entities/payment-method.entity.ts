import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { Media } from '../../media/entities/media.entity';
import { OrderPayment } from './order-payment.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

@Entity('payment_methods')
@Unique(['name'])
@Unique(['code'])
export class PaymentMethod {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', nullable: false })
    name: string;

    @Column({ type: 'varchar', nullable: false })
    code: string;

    @Column({ type: 'bigint', nullable: true })
    logoMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.paymentMethods)
    @JoinColumn({ name: 'logoMediaId' })
    logoMedia: Media | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'json', nullable: true })
    apiConfiguration: object | null;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Order, (order) => order.paymentMethod)
    orders: Order[];

    @OneToMany(() => OrderPayment, (payment) => payment.paymentMethod)
    orderPayments: OrderPayment[];
}