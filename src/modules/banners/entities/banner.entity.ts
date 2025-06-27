// src/banner/entities/banner.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Media } from '../../media/entities/media.entity'; // Đảm bảo đường dẫn đúng

@Entity('banners')
export class Banner {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string | null;

    @Column({ type: 'bigint', nullable: false })
    media_id: number;

    @ManyToOne(() => Media, { onDelete: 'RESTRICT' }) // Đã thay đổi thành RESTRICT
    @JoinColumn({ name: 'media_id' })
    media: Media;

    @Column({ type: 'varchar', length: 255, nullable: true })
    link_url: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    position_key: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    banner_type: string | null;

    @Column({ type: 'int', default: 0, nullable: false })
    display_order: number;

    @Column({ type: 'datetime', nullable: true })
    starts_at: Date | null;

    @Column({ type: 'datetime', nullable: true })
    ends_at: Date | null;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;
}