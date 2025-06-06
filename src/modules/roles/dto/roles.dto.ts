import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Action } from '../enums/action.enum';
import { Resource } from '../enums/resource.enum';

export class PermissionDto {
    @IsString()
    resource: Resource;

    @IsArray()
    action: Action[];
}

export class CreateRoleDto {
    @IsString()
    name: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionDto)
    permissions: PermissionDto[];
}
