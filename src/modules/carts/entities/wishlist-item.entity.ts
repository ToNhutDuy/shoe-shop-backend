import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    Unique,
} from 'typeorm';

@Entity('wishlist_items')
@Unique(['userId', 'productVariantId'])
export class WishlistItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    userId: number;

    @ManyToOne(() => User, (user) => user.wishlistItems)
    user: User;

    @Column({ type: 'bigint', nullable: false })
    productVariantId: number;

    @ManyToOne(() => ProductVariant, (variant) => variant.wishlistItems)
    productVariant: ProductVariant;

    @Column({ type: 'timestamp', nullable: false })
    addedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
