import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('email_verification_tokens')
@Unique(['token'])
@Unique(['user'])
export class EmailVerificationToken {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.emailVerificationToken, { onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    token: string;

    @Column({ type: 'datetime', nullable: false })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

}
