import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Product } from './product.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

export enum ReviewStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('product_reviews')
export class ProductReview {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    productId: number;

    @ManyToOne(() => Product, (product) => product.reviews)
    product: Product;

    @Column({ type: 'bigint', nullable: false })
    userId: number;

    @ManyToOne(() => User, (user) => user.productReviews)
    user: User;

    @Column({ type: 'bigint', nullable: true })
    orderId: number | null;

    @ManyToOne(() => Order, (order) => order.productReviews)
    order: Order | null;

    @Column({ type: 'tinyint', nullable: false })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @Column({
        type: 'enum',
        nullable: false,
        default: ReviewStatus.PENDING,
        enum: ReviewStatus,
    })
    status: ReviewStatus;

    @Column({ type: 'datetime', nullable: false })
    reviewedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
