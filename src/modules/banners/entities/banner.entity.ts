import { Media } from 'src/modules/media/entities/media.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';


@Entity('banners')
export class Banner {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string | null;

    @Column({ type: 'bigint', nullable: true })
    mediaId: number | null;

    @ManyToOne(() => Media, (media) => media.banners)
    @JoinColumn({ name: 'mediaId' })
    media: Media | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    linkUrl: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    positionKey: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    bannerType: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @Column({ type: 'datetime', nullable: true })
    startsAt: Date | null;

    @Column({ type: 'datetime', nullable: true })
    endsAt: Date | null;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
