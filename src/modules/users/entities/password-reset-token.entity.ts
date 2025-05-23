import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_tokens')
@Unique(['token'])
export class PasswordResetToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    userId: number;

    @ManyToOne(() => User, (user) => user.passwordResetTokens, { onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    token: string;

    @Column({ type: 'datetime', nullable: false })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
