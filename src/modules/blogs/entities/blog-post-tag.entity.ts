// src/blog/entities/blog-post-tag.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { Tag } from './tag.entity';

@Entity('blog_post_tags')
export class BlogPostTag {
    @PrimaryColumn()
    blog_post_id: number;

    @PrimaryColumn()
    tag_id: number;

    @ManyToOne(() => BlogPost, (blogPost) => blogPost.blogPostTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blog_post_id' })
    blogPost: BlogPost;

    @ManyToOne(() => Tag, (tag) => tag.blogPostTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tag_id' })
    tag: Tag;

    @CreateDateColumn()
    created_at: Date;
}