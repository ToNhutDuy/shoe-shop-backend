
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';
import { BlogPost } from './blog-post.entity';

@Entity('blog_categories')
@Unique(['name'])
@Unique(['slug'])
export class BlogCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => BlogPost, (post) => post.category)
    posts: BlogPost[];
}

