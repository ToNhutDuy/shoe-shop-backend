import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Unique,
} from 'typeorm';
import { BlogPostTag } from './blog-post-tag.entity';

@Entity('tags')
@Unique(['name'])
@Unique(['slug'])
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    slug: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => BlogPostTag, (bpt) => bpt.tag)
    blogPostTags: BlogPostTag[];
}
