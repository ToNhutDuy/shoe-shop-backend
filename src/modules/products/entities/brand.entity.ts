// src/product/entities/brand.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('brands')
export class Brand {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'bigint', nullable: true })
    logo_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'logo_media_id' })
    logo: Media;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => Product, (product) => product.brand)
    products: Product[];
}