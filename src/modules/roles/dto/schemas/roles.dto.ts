import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Resource } from '../../enums/resource.enum';
import { Action } from '../../enums/action.enum';


export class PermissionDto {
    @IsEnum(Resource)
    @IsNotEmpty()
    resource: Resource;

    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(Action, { each: true })
    action: Action[];
}

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsArray()
    @ArrayMinSize(0)
    @ValidateNested({ each: true })
    @Type(() => PermissionDto)
    permissions: PermissionDto[];
}

export class UpdateRoleDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class AddPermissionToRoleDto {
    @IsEnum(Resource)
    @IsNotEmpty()
    resource: Resource;

    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(Action, { each: true })
    action: Action[];
}

export class RemovePermissionFromRoleDto {
    // Chỉ cần ID của RolePermission để xóa nó
    @IsNotEmpty()
    rolePermissionId: number;
}