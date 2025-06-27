// src/promotion/entities/order-promotion.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';

import { Promotion } from './promotion.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

@Entity('order_promotions')
@Unique(['order_id', 'promotion_id'])
export class OrderPromotion {
    @PrimaryColumn({ name: 'order_id', type: 'bigint' })
    order_id: number;

    @PrimaryColumn({ name: 'promotion_id', type: 'int' })
    promotion_id: number;

    @ManyToOne(() => Order, (order) => order.orderPromotions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ManyToOne(() => Promotion, (promotion) => promotion.orderPromotions, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'promotion_id' })
    promotion: Promotion;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    amount_discounted: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    applied_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;
}