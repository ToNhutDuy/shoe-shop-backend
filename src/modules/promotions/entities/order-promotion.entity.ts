import { Entity, PrimaryColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { Promotion } from './promotion.entity';
import { Order } from 'src/modules/orders/entities/order.entity';


@Entity('order_promotion')
export class OrderPromotion {
    @PrimaryColumn({ type: 'bigint' })
    orderId: number;

    @PrimaryColumn({ type: 'int' })
    promotionId: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    amountDiscounted: number;

    @Column({ type: 'timestamp', nullable: false })
    appliedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Order, (order) => order.promotions)
    order: Order;

    @ManyToOne(() => Promotion, (promotion) => promotion.orderApplications)
    promotion: Promotion;
}
