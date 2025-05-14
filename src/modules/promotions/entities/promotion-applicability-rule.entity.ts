import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Promotion } from './promotion.entity';

export enum RuleType {
    PRODUCT = 'product',
    CATEGORY = 'category',
    USER = 'user',
    PRODUCT_VARIANT = 'product_variant',

}

export enum ApplicabilityType {
    INCLUDE = 'include',
    EXCLUDE = 'exclude',

}

@Entity('promotion_applicability_rules')
export class PromotionApplicabilityRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: false })
    promotionId: number;

    @ManyToOne(
        () => Promotion,
        (promotion) => promotion.applicabilityRules,
    )
    promotion: Promotion;

    @Column({
        type: 'enum',
        nullable: false,
        enum: RuleType,
    })
    ruleType: RuleType;

    @Column({ type: 'bigint', nullable: false })
    entityId: number;

    @Column({
        type: 'enum',
        nullable: false,
        enum: ApplicabilityType,
    })
    applicabilityType: ApplicabilityType;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
