// src/blog/entities/blog-category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { BlogPost } from './blog-post.entity';

@Entity('blog_categories')
export class BlogCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => BlogPost, (blogPost) => blogPost.blogCategory)
    blogPosts: BlogPost[];
}