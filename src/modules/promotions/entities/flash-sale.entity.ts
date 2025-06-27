// src/promotion/entities/flash-sale.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { FlashSaleProduct } from './flash-sale-product.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('flash_sales')
export class FlashSale {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'datetime', nullable: false })
    starts_at: Date;

    @Column({ type: 'datetime', nullable: false })
    ends_at: Date;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'bigint', nullable: true })
    banner_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'banner_media_id' })
    banner: Media;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => FlashSaleProduct, (flashSaleProduct) => flashSaleProduct.flashSale)
    flashSaleProducts: FlashSaleProduct[];
}