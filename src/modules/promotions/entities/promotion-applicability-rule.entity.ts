// src/promotion/entities/promotion-applicability-rule.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Promotion } from './promotion.entity';

@Entity('promotion_applicability_rules')
@Unique(['promotion_id', 'rule_type', 'entity_id', 'applicability_type'])
export class PromotionApplicabilityRule {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'int', nullable: false })
    promotion_id: number;

    @ManyToOne(() => Promotion, (promotion) => promotion.applicabilityRules, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'promotion_id' })
    promotion: Promotion;

    @Column({ type: 'varchar', length: 50, nullable: false })
    rule_type: string;

    @Column({ type: 'bigint', nullable: false })
    entity_id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    applicability_type: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}