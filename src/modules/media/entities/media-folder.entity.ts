// src/media/entities/media-folder.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Unique, DeleteDateColumn } from 'typeorm';

import { Media } from './media.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('media_folders')
@Unique(['name', 'parent_folder_id'])
export class MediaFolder {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    slug: string;

    @Column({ type: 'bigint', nullable: true })
    parent_folder_id: number | null;

    @ManyToOne(() => MediaFolder, (folder) => folder.childrenFolders, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_folder_id' })
    parentFolder: MediaFolder;

    @OneToMany(() => MediaFolder, (folder) => folder.parentFolder)
    childrenFolders: MediaFolder[];

    @Column({ type: 'bigint', nullable: true })
    created_by_user_id: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by_user_id' })
    createdBy: User;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', nullable: false })
    updated_at: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true, name: 'deleted_at' })
    deleted_at: Date | null;

    @OneToMany(() => Media, (media) => media.parentFolder)
    media: Media[];
}