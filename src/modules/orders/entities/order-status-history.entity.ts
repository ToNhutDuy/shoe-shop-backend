// src/order/entities/order-status-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from 'src/modules/users/entities/user.entity';


@Entity('order_status_history')
export class OrderStatusHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    order_id: number;

    @ManyToOne(() => Order, (order) => order.statusHistory, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ type: 'varchar', length: 50, nullable: true })
    previous_status_code: string | null;

    @Column({ type: 'varchar', length: 50, nullable: false })
    new_status_code: string;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'datetime', nullable: false })
    changed_at: Date;

    @Column({ type: 'int', nullable: true })
    changed_by_user_id: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'changed_by_user_id' })
    changedByUser: User;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;
}