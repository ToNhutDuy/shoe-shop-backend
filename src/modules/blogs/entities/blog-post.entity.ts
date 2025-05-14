import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Unique,
} from 'typeorm';

import { BlogCategory } from './blog-category.entity';
import { BlogPostTag } from './blog-post-tag.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Media } from 'src/modules/media/entities/media.entity';

export enum BlogPostStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

@Entity('blog_posts')
@Unique(['slug'])
export class BlogPost {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    title: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: false })
    contentHtml: string;

    @Column({ type: 'text', nullable: true })
    excerpt: string | null;

    @Column({ type: 'int', nullable: false })
    blogCategoryId: number;

    @ManyToOne(() => BlogCategory, (category) => category.posts)
    @JoinColumn({ name: 'blogCategoryId' })
    category: BlogCategory;

    @Column({ type: 'bigint', nullable: true })
    authorUserId: number | null;

    @ManyToOne(() => User, (user) => user.blogPosts)
    @JoinColumn({ name: 'authorUserId' })
    author: User | null;

    @Column({ type: 'bigint', nullable: true })
    featuredImageMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.blogPosts)
    @JoinColumn({ name: 'featuredImageMediaId' })
    featuredImageMedia: Media | null;

    @Column({
        type: 'enum',
        enum: BlogPostStatus,
        nullable: false,
        default: BlogPostStatus.DRAFT,
    })
    status: BlogPostStatus;

    @Column({ type: 'datetime', nullable: true })
    publishedAt: Date | null;

    @Column({ type: 'int', default: 0 })
    viewCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => BlogPostTag, (bpt) => bpt.blogPost)
    blogPostTags: BlogPostTag[];
}
