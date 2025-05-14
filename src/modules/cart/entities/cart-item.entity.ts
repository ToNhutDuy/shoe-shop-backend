import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';

@Entity('cart_items')

@Unique(['userId', 'productVariantId'])
@Unique(['sessionId', 'productVariantId'])
export class CartItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: true })
    userId: number | null;

    @ManyToOne(() => User, (user) => user.cartItems)
    user: User | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    sessionId: string | null;

    @Column({ type: 'bigint', nullable: false })
    productVariantId: number;

    @ManyToOne(() => ProductVariant, (variant) => variant.cartItems)
    productVariant: ProductVariant;

    @Column({ type: 'int', nullable: false })
    quantity: number;

    @Column({ type: 'timestamp', nullable: false })
    addedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}