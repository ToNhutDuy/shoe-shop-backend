// user-simple.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { UserStatus } from '../entities/user.entity';

@Exclude()
export class UserSimpleDto {
    @Expose()
    id: number;

    @Expose()
    fullName: string;

    @Expose()
    email: string;

    @Expose()
    phoneNumber: string;

    @Expose()
    status: UserStatus;

    @Expose()
    code: string;

    @Expose()
    role_id: number;

    @Expose()
    expiresIn: number;
}
