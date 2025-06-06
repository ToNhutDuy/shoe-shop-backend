// users-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { AddressResponseDto } from './address-response.dto';
import { UserStatus } from '../entities/user.entity';

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
    status: UserStatus;

    @Expose()
    code: string;

    @Expose()
    role_id: number;

    @Expose()
    expiresIn: number;

    @Expose()
    @Type(() => AddressResponseDto)
    addresses?: AddressResponseDto[];
}
