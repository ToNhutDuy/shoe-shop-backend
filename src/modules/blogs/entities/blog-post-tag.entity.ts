import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { Tag } from './tag.entity';

@Entity('blog_post_tags')
@Unique(['blogPostId', 'tagId'])
export class BlogPostTag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    blogPostId: number;

    @Column({ type: 'int' })
    tagId: number;

    @ManyToOne(() => BlogPost, (post) => post.blogPostTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blogPostId' })
    blogPost: BlogPost;

    @ManyToOne(() => Tag, (tag) => tag.blogPostTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tagId' })
    tag: Tag;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
