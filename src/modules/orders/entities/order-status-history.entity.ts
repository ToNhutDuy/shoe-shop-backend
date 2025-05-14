import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
    JoinColumn
} from 'typeorm';
import { Order } from './order.entity';
import { User } from 'src/modules/users/entities/user.entity';


export enum OrderStatusCode {
    PENDING_CONFIRMATION = 'pending_confirmation',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURNED = 'returned',
}

@Entity('order_status_history')
export class OrderStatusHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    orderId: number;

    @ManyToOne(() => Order, (order) => order.statusHistory)
    order: Order;

    @Column({
        type: 'enum',
        nullable: true,
        enum: OrderStatusCode,
    })
    previousStatusCode: OrderStatusCode | null;

    @Column({
        type: 'enum',
        nullable: false,
        enum: OrderStatusCode,
    })
    newStatusCode: OrderStatusCode;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'datetime', nullable: false })
    changedAt: Date;

    @Column({ type: 'int', nullable: true })
    changedByUserId: number | null;

    @ManyToOne(() => User, (user) => user.orderStatusHistoryEntries)
    @JoinColumn({ name: 'changedByUserId' })  // Đặt tên khóa ngoại là 'changedByUserId'
    changedBy: User | null;


    @CreateDateColumn()
    createdAt: Date;
}