import { Exclude, Expose } from 'class-transformer';
import { Role } from '../../role/entities/role.entity';

@Exclude()
export class UserResponseDto {
    @Expose()
    id: number;

    @Expose()
    fullName: string;

    @Expose()
    email: string;

    @Expose()
    phoneNumber: string;

    @Expose()
    status: string;

    @Expose()
    role: Role;
}
