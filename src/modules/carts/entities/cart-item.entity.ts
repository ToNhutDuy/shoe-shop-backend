// src/cart/entities/cart-item.entity.ts
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';


@Entity('cart_items')
@Unique(['user_id', 'session_id', 'product_variant_id'])
export class CartItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: true })
    user_id: number | null;

    @ManyToOne(() => User, (user) => user.cartItems, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: true })
    session_id: string | null;

    @Column({ type: 'bigint', nullable: false })
    product_variant_id: number;

    @ManyToOne(() => ProductVariant, (productVariant) => productVariant.cartItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_variant_id' })
    productVariant: ProductVariant;

    @Column({ type: 'int', nullable: false })
    quantity: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    added_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}