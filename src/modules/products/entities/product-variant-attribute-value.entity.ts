import {
    Entity,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { AttributeValue } from './attribute-value.entity';

@Entity('product_variant_attribute_value')
export class ProductVariantAttributeValue {

    @PrimaryColumn({ type: 'bigint' })
    productVariantId: number;

    @PrimaryColumn({ type: 'int' })
    attributeValueId: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(
        () => ProductVariant,
        (productVariant) => productVariant.attributeValues,
    )
    productVariant: ProductVariant;

    @ManyToOne(
        () => AttributeValue,
        (attributeValue) => attributeValue.productVariantAttributeValues,
    )
    attributeValue: AttributeValue;
}