import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginAuthDto {
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @IsNotEmpty({ message: 'Phải nhập email' })
    email: string;

    @IsNotEmpty({ message: 'Phải nhập mật khẩu' })
    passwordHash: string;
}