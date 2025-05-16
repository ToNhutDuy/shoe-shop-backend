import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateUserDto {

    @IsOptional()
    @IsString({ message: 'Tên phải là ký tự' })
    fullName?: string;

    @IsOptional()
    @IsString({ message: 'Số điện thoại phải là chuỗi' })
    phoneNumber?: string;
}
