import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Media } from 'src/modules/media/entities/media.entity';

@Entity('product_gallery_media')
export class ProductGalleryMedia {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    productId: number;

    @ManyToOne(() => Product, (product) => product.gallery)
    product: Product;

    @Column({ type: 'bigint', nullable: false })
    mediaId: number;

    @ManyToOne(() => Media, (media) => media.productGalleryEntries)
    @JoinColumn({ name: 'mediaId' })
    media: Media;

    @Column({ type: 'varchar', length: 255, nullable: true })
    altText: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}