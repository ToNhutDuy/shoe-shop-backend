import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';
export enum CmsPageStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    UNPUBLISHED = 'unpublished',

}

@Entity('cms_pages')
@Unique(['slug'])
export class CmsPage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    title: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: false })
    contentHtml: string;

    @Column({
        type: 'enum',
        nullable: false,
        default: CmsPageStatus.PUBLISHED,
        enum: CmsPageStatus,
    })
    status: CmsPageStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    metaTitle: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
