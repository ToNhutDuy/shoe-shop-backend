// src/product/entities/product-category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Media } from '../../media/entities/media.entity';
import { BlogPost } from 'src/modules/blogs/entities/blog-post.entity';


@Entity('product_categories')
export class ProductCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'int', nullable: true })
    parent_category_id: number | null;

    @ManyToOne(() => ProductCategory, (category) => category.childrenCategories, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parent_category_id' })
    parentCategory: ProductCategory | null;

    @OneToMany(() => ProductCategory, (category) => category.parentCategory)
    childrenCategories: ProductCategory[];


    @Column({ type: 'bigint', nullable: true })
    cover_image_media_id: number | null;

    @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'cover_image_media_id' })
    coverImage: Media;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'int', default: 0, nullable: false })
    display_order: number;

    @Column({ type: 'boolean', default: true, nullable: false })
    is_active: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];

    @OneToMany(() => BlogPost, (blogPost) => blogPost.blogCategory)
    blogPosts: BlogPost[];
}