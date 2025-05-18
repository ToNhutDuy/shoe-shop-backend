import { IsEmail, isEmail, IsNotEmpty, MinLength } from "class-validator";

export class ForgotAuthDto {

    @IsEmail({}, { message: "Email không đúng định dạng" })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;
}

export class ChangePasswordAuthDto {

    @IsNotEmpty({ message: 'Code token không được để trống' })
    code: string;

    @IsEmail({}, { message: "Email không đúng định dạng" })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;

    @MinLength(8, { message: 'Password phải có ít nhất 8 ký tự' })
    @IsNotEmpty({ message: 'Password không được để trống' })
    password: string;

    @MinLength(8, { message: 'Password phải có ít nhất 8 ký tự' })
    @IsNotEmpty({ message: 'Confirm password không được để trống' })
    confirmPassword: string;
}