// src/promotion/entities/promotion.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { OrderPromotion } from './order-promotion.entity';
import { PromotionApplicabilityRule } from './promotion-applicability-rule.entity';

@Entity('promotions')
@Unique(['code'])
export class Promotion {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    code: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', length: 50, nullable: false })
    discount_type: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    discount_value: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    minimum_order_value: number | null;

    @Column({ type: 'int', nullable: true })
    maximum_usage_limit: number | null;

    @Column({ type: 'int', default: 0, nullable: false })
    current_usage_count: number;

    @Column({ type: 'int', nullable: true })
    usage_limit_per_user: number | null;

    @Column({ type: 'datetime', nullable: false })
    starts_at: Date;

    @Column({ type: 'datetime', nullable: false })
    ends_at: Date;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => OrderPromotion, (orderPromotion) => orderPromotion.promotion)
    orderPromotions: OrderPromotion[];

    @OneToMany(() => PromotionApplicabilityRule, (rule) => rule.promotion)
    applicabilityRules: PromotionApplicabilityRule[];
}