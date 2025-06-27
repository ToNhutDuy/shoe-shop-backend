// src/product/entities/product-review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Order } from 'src/modules/orders/entities/order.entity';


@Entity('product_reviews')
export class ProductReview {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'bigint', nullable: false })
    product_id: number;

    @ManyToOne(() => Product, (product) => product.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'bigint', nullable: false })
    user_id: number;

    @ManyToOne(() => User, (user) => user.productReviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'bigint', nullable: true })
    order_id: number | null;

    @ManyToOne(() => Order, (order) => order.productReviews, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'tinyint', nullable: false })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @Column({ type: 'varchar', length: 50, default: 'pending', nullable: false })
    status: string;

    @Column({ type: 'datetime', nullable: false })
    reviewed_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}