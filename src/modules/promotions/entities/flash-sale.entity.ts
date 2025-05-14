import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FlashSaleProduct } from './flash-sale-product.entity';
import { Media } from 'src/modules/media/entities/media.entity';

@Entity('flash_sales')
export class FlashSale {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'datetime', nullable: false })
    startsAt: Date;

    @Column({ type: 'datetime', nullable: false })
    endsAt: Date;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @Column({ type: 'bigint', nullable: true })
    bannerMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.flashSales)
    @JoinColumn({ name: 'bannerMediaId' })
    bannerMedia: Media | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => FlashSaleProduct, (fsProduct) => fsProduct.flashSale)
    products: FlashSaleProduct[];
}