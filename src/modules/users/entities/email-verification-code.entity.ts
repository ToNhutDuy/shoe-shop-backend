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

@Entity('email_verification_codes')
@Unique(['code'])
@Unique(['user'])
export class EmailVerificationCode {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.emailVerificationCode, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    code: string;

    @Column({ type: 'datetime', nullable: false })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

}
