import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';
import { OrderPromotion } from './order-promotion.entity';
import { PromotionApplicabilityRule } from './promotion-applicability-rule.entity';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED_AMOUNT_ORDER = 'fixed_amount_order',
    FREE_SHIPPING = 'free_shipping',

}

@Entity('promotions')
@Unique(['code'])
export class Promotion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    code: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        type: 'enum',
        nullable: false,
        enum: DiscountType,
    })
    discountType: DiscountType;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    discountValue: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    minimumOrderValue: number | null;

    @Column({ type: 'int', nullable: true })
    maximumUsageLimit: number | null;

    @Column({ type: 'int', default: 0 })
    currentUsageCount: number;

    @Column({ type: 'int', nullable: true })
    usageLimitPerUser: number | null;

    @Column({ type: 'datetime', nullable: false })
    startsAt: Date;

    @Column({ type: 'datetime', nullable: false })
    endsAt: Date;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => OrderPromotion, (orderPromotion) => orderPromotion.promotion)
    orderApplications: OrderPromotion[];

    @OneToMany(
        () => PromotionApplicabilityRule,
        (rule) => rule.promotion,
    )
    applicabilityRules: PromotionApplicabilityRule[];
}