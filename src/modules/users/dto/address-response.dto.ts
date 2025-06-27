import { Expose } from 'class-transformer';
import { AddressType } from 'src/common/enums/address.enum';

export class AddressResponseDto {
    @Expose()
    id: number;

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
    addressType: AddressType | null;

    @Expose()
    isDefault: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    constructor(partial: Partial<AddressResponseDto>) {
        Object.assign(this, partial);
    }

    static fromEntity(address: any): AddressResponseDto {
        return new AddressResponseDto({
            id: address.id,
            recipientFullName: address.recipientFullName,
            recipientPhoneNumber: address.recipientPhoneNumber,
            streetAddress: address.streetAddress,
            ward: address.ward,
            district: address.district,
            cityProvince: address.cityProvince,
            country: address.country,
            addressType: address.addressType,
            isDefault: address.isDefault,
            createdAt: address.createdAt,
            updatedAt: address.updatedAt,
        });
    }
}
