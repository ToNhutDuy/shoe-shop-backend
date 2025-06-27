// src/cart/entities/wishlist-item.entity.ts
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';


@Entity('wishlist_items')
@Unique(['user_id', 'product_variant_id'])
export class WishlistItem {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'bigint', nullable: false })
    user_id: number;

    @ManyToOne(() => User, (user) => user.wishlistItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'bigint', nullable: false })
    product_variant_id: number;

    @ManyToOne(() => ProductVariant, (productVariant) => productVariant.wishlistItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_variant_id' })
    productVariant: ProductVariant;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    added_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;
}