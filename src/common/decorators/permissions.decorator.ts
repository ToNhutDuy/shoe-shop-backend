import { SetMetadata } from '@nestjs/common';
import { PermissionDto } from 'src/modules/roles/dto/roles.dto';
import { Action } from 'src/modules/roles/enums/action.enum';
import { Resource } from 'src/modules/roles/enums/resource.enum';
export const PERMISSIONS_KEY = 'permissions';


export interface PermissionDefinition {
    resource: Resource;
    action: Action[];
}

export const Permissions = (permissions: PermissionDefinition[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);