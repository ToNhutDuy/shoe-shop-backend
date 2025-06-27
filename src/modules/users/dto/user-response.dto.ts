import { Expose, Type } from 'class-transformer';
import { AccountType, UserStatus } from '../entities/user.entity';
import { AddressResponseDto } from './address-response.dto';
import { RoleResponse } from 'src/modules/roles/dto/role-response.dto';


export class UsersResponseDto {
    @Expose()
    id: number;

    @Expose()
    email: string;

    @Expose()
    fullName: string | null;

    @Expose()
    phoneNumber: string | null;

    @Expose()
    googleId: string | null;

    @Expose()
    accountType: AccountType;

    @Expose()
    avatar: string | null;

    @Expose()
    get avatarUrl(): string | null {
        return this.avatar ? `${process.env.BASE_URL}/${this.avatar}` : null;
    }

    @Expose()
    status: UserStatus;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => RoleResponse)
    role: RoleResponse;

    @Expose()
    @Type(() => AddressResponseDto)
    addresses: AddressResponseDto[];

    constructor(partial: Partial<UsersResponseDto>) {
        Object.assign(this, partial);
    }

    static fromEntity(user: any): UsersResponseDto {
        return new UsersResponseDto({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            googleId: user.googleId,
            accountType: user.accountType,
            avatar: user.avatar,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: {
                id: user.role?.id,
                name: user.role?.name,
                description: user.role?.description ?? '',
                permissions: user.role?.rolePermissions?.map((rp: any) => ({
                    resource: rp.permission.resource,
                    actions: rp.action, // lấy từ RolePermission
                })) ?? [],
            },
            addresses: user.addresses?.map((address: any) =>
                AddressResponseDto.fromEntity(address),
            ) || [],
        });
    }

}

