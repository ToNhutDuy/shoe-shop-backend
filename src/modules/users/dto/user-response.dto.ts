import { Exclude, Expose } from 'class-transformer';
import { Roles } from '../../roles/entities/role.entity';

@Exclude()
export class UsersResponseDto {
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
    role: Roles;
}
