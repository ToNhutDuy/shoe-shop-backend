import { IsString, IsBoolean, IsOptional, IsEnum, Length } from 'class-validator';
import { AddressType } from '../entities/address.entity'; // Import AddressType enum

export class CreateAddressDto {
    @IsString({ message: 'Họ tên người nhận phải là chuỗi' })
    recipientFullName: string;

    @IsString({ message: 'Số điện thoại người nhận phải là chuỗi' })
    @Length(10, 20, { message: 'Số điện thoại phải từ 10 đến 20 ký tự' })
    recipientPhoneNumber: string;

    @IsString({ message: 'Số nhà, tên đường phải là chuỗi' })
    streetAddress: string;

    @IsString({ message: 'Phường/xã phải là chuỗi' })
    ward: string;

    @IsString({ message: 'Quận/huyện phải là chuỗi' })
    district: string;

    @IsString({ message: 'Tỉnh/thành phố phải là chuỗi' })
    cityProvince: string;

    @IsOptional()
    @IsString({ message: 'Quốc gia phải là chuỗi' })
    country?: string;

    @IsOptional()
    @IsEnum(AddressType, { message: 'Loại địa chỉ không hợp lệ' })
    addressType?: AddressType;

    @IsOptional()
    @IsBoolean({ message: 'Mặc định phải là boolean' })
    isDefault?: boolean;
}