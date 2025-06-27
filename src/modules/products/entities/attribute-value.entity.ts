// src/product/entities/attribute-value.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { Attribute } from './attribute.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';

@Entity('attribute_values')
@Unique(['attribute_id', 'value'])
export class AttributeValue {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: false })
    attribute_id: number;

    @ManyToOne(() => Attribute, (attribute) => attribute.attributeValues, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'attribute_id' })
    attribute: Attribute;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    value: string;

    @Column({ type: 'varchar', length: 7, nullable: true })
    color_code: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => ProductVariantAttributeValue, (pvav) => pvav.attributeValue)
    productVariantAttributeValues: ProductVariantAttributeValue[];
}