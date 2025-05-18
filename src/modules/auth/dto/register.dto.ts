import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterAuthDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    @IsEmail({}, { message: 'Email sai định dạng' })
    email: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @IsString({ message: 'Mật khẩu phải là chuỗi' })
    password: string;

    @IsOptional()
    @IsString({ message: 'Tên phải là ký tự' })
    fullName?: string;

    @IsOptional()
    @IsString({ message: 'Số điện thoại phải là chuỗi' })
    phoneNumber?: string;
}

export class CheckCodeTokenAuthDto {
    @IsNotEmpty({ message: 'Id không được để trống' })
    id: number;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    token: string;
}
