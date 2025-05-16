import { IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDto {


    @IsNotEmpty({ message: 'Tên quyền không được để trống' })
    @IsString({ message: 'Tên quyền phải là ký tự' })
    name: string;

    @IsString({ message: 'Nội dung phải là ký tự' })
    description: string | null;
}
