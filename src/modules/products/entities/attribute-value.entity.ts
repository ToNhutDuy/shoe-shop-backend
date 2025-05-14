// attribute-value.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { Attribute } from './attribute.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';

@Entity('attribute_values')
@Unique(['attributeId', 'value'])
export class AttributeValue {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: false })
    attributeId: number;

    @ManyToOne(() => Attribute, (attribute) => attribute.values)
    attribute: Attribute;

    @Column({ type: 'varchar', length: 100, nullable: false })
    value: string;

    @Column({ type: 'varchar', length: 7, nullable: true })
    colorCode: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(
        () => ProductVariantAttributeValue,
        (pvav) => pvav.attributeValue,
    )
    productVariantAttributeValues: ProductVariantAttributeValue[];
}