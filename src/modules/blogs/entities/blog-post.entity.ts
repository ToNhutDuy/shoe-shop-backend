// src/blog/entities/blog-post.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
    ManyToMany,
    JoinTable,
    Unique,
} from 'typeorm';
import { BlogCategory } from './blog-category.entity';

import { Media } from '../../media/entities/media.entity';
import { BlogPostTag } from './blog-post-tag.entity';
import { Tag } from './tag.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('blog_posts')
export class BlogPost {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    title: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: false })
    content_html: string;

    @Column({ type: 'text', nullable: true })
    excerpt: string | null;

    @Column({ type: 'int', nullable: false })
    blog_category_id: number;

    @ManyToOne(() => BlogCategory, (category) => category.blogPosts, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'blog_category_id' })
    blogCategory: BlogCategory;

    @Column({ type: 'bigint', nullable: true })
    author_user_id: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'author_user_id' })
    author: User;

    @Column({ type: 'bigint', nullable: true })
    featured_image_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'featured_image_media_id' })
    featuredImage: Media;

    @Column({ type: 'varchar', length: 50, default: 'draft', nullable: false })
    status: string;

    @Column({ type: 'datetime', nullable: true })
    published_at: Date | null;

    @Column({ type: 'int', default: 0, nullable: false })
    view_count: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => BlogPostTag, (blogPostTag) => blogPostTag.blogPost)
    blogPostTags: BlogPostTag[];
}