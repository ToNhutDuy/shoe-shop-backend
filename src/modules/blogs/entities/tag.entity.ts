// src/blog/entities/tag.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { BlogPostTag } from './blog-post-tag.entity';


@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    title: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => BlogPostTag, (blogPostTag) => blogPostTag.tag)
    blogPostTags: BlogPostTag[];
}