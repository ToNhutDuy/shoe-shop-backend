import { Media } from 'src/modules/media/entities/media.entity';
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
    Unique,
    OneToMany
} from 'typeorm';
import { Order } from './order.entity';


@Entity('shipping_providers')
@Unique(['name'])
export class ShippingProvider {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'bigint', nullable: true })
    logoMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.shippingProviders)
    @JoinColumn({ name: 'logoMediaId' })
    logoMedia: Media | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    apiKey: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    webhookUrl: string | null;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Order, (order) => order.shippingProvider)
    orders: Order[];
}