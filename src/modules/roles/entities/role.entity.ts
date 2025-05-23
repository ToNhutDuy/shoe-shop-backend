import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Unique } from 'typeorm';


@Entity('roles')
@Unique(['name'])
export class Roles {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => User, (user) => user.role)
    users: User[];
}

