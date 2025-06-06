import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Media } from 'src/modules/media/entities/media.entity';

@Entity('product_gallery_media')
export class ProductGalleryMedia {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    product_id: number;

    @Column({ type: 'bigint', nullable: false })
    media_id: number;

    @Column({ type: 'int', default: 0 })
    display_order: number; // Thứ tự hiển thị trong gallery

    @Column({ type: 'varchar', length: 255, nullable: true })
    alt_text: string; // Alt text cụ thể cho hình ảnh này trong ngữ cảnh sản phẩm này

    @ManyToOne(() => Product, product => product.productGalleryEntries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ManyToOne(() => Media, media => media.productGalleryEntries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'media_id' })
    media: Media;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}