import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';

export enum CmsPageStatus {
    PUBLISHED = 'published',
    DRAFT = 'draft',
    ARCHIVED = 'archived',
}

@Entity('cms_pages')
export class CmsPage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    title: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: false })
    content_html: string;

    @Column({
        type: 'enum',
        enum: CmsPageStatus,
        default: CmsPageStatus.PUBLISHED,
        nullable: false,
    })
    status: CmsPageStatus;

    // FIX: Explicitly allow null for meta_title in the entity type
    @Column({ type: 'varchar', length: 255, nullable: true })
    meta_title: string | null; // <--- CHANGE THIS LINE

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at: Date;
}