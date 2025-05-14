import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('email_verification_tokens')
@Unique(['token'])
export class EmailVerificationToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false, unique: true })
    userId: number;

    @OneToOne(() => User, (user) => user.emailVerificationToken)
    @JoinColumn({ name: 'userId' })
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

