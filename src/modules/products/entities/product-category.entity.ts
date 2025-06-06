import { Media } from 'src/modules/media/entities/media.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Unique, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_categories')
@Unique(['name'])
@Unique(['slug'])
export class ProductCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'int', nullable: true })
    parentCategoryId: number | null;

    @ManyToOne(() => ProductCategory, (category) => category.children)
    parentCategory: ProductCategory | null;

    @OneToMany(() => ProductCategory, (category) => category.parentCategory)
    children: ProductCategory[];

    @Column({ type: 'bigint', nullable: true })
    coverImageMediaId: number | null; // Cột khóa ngoại

    @ManyToOne(() => Media, (media) => media.productCategories, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'coverImageMediaId' })
    coverImageMedia: Media | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @Column({ type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];
}