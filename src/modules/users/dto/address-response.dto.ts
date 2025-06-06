// address-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { AddressType } from 'src/common/enums/address.enum';
import { UserSimpleDto } from './user-simple.dto';

@Exclude()
export class AddressResponseDto {
    @Expose()
    id: number;

    @Expose()
    userId: number;

    @Expose()
    recipientFullName: string;

    @Expose()
    recipientPhoneNumber: string;

    @Expose()
    streetAddress: string;

    @Expose()
    ward: string;

    @Expose()
    district: string;

    @Expose()
    cityProvince: string;

    @Expose()
    country: string;

    @Expose()
    addressType: AddressType;

    @Expose()
    isDefault: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => UserSimpleDto)
    user?: UserSimpleDto;
}
