// src/order/entities/shipping-provider.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('shipping_providers')
export class ShippingProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name: string;

    @Column({ type: 'bigint', nullable: true })
    logo_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'logo_media_id' })
    logo: Media;

    @Column({ type: 'varchar', length: 255, nullable: true })
    api_key: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    webhook_url: string | null;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => Order, (order) => order.shippingProvider)
    orders: Order[];
}