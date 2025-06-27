// src/product/entities/product-variant-attribute-value.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Unique, Column } from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { AttributeValue } from './attribute-value.entity';

@Entity('product_variant_attribute_values')
@Unique(['product_variant_id', 'attribute_value_id'])
export class ProductVariantAttributeValue {
    @PrimaryColumn({ name: 'product_variant_id', type: 'bigint' })
    product_variant_id: number;

    @PrimaryColumn({ name: 'attribute_value_id', type: 'int' })
    attribute_value_id: number;

    @ManyToOne(() => ProductVariant, (variant) => variant.attributeValues, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_variant_id' })
    productVariant: ProductVariant;

    @ManyToOne(() => AttributeValue, (attributeValue) => attributeValue.productVariantAttributeValues, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'attribute_value_id' })
    attributeValue: AttributeValue;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;
}