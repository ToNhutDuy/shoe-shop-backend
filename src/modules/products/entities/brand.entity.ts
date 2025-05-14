import { Media } from 'src/modules/media/entities/media.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('brands')
@Unique(['name'])
@Unique(['slug'])
export class Brand {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    slug: string;

    @Column({ type: 'bigint', nullable: true })
    logoMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.brands)
    @JoinColumn({ name: 'logoMediaId' })
    logoMedia: Media | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Product, (product) => product.brand)
    products: Product[];
}
