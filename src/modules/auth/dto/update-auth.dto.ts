import { IsNotEmpty } from "class-validator";

export class RetryActivationDto {
    @IsNotEmpty({ message: 'Email không được để trống' })
    email: string;
}