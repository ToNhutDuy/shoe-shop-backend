import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Media } from 'src/modules/media/entities/media.entity';
import { Product } from './product.entity';

@Entity('product_gallery_media')
export class ProductGalleryMedia {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    mediaId: number;
    @Column({ type: 'varchar', length: 255, nullable: true })
    altText: string | null;

    @Column({ type: 'int', default: 0, nullable: false })
    display_order: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @ManyToOne(() => Media, media => media.productGalleryMedia, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'media_id' })
    media: Media | null;

    @ManyToOne(() => Product, productId => productId.galleryMedia, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;
}
