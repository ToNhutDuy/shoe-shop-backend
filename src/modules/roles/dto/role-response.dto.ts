import { Expose, Type } from 'class-transformer';

export class PermissionResponse {
    @Expose()
    resource: string;

    @Expose()
    actions: string[];
}

export class RoleResponse {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    description?: string;

    @Expose()
    @Type(() => PermissionResponse)
    permissions: PermissionResponse[];
}


export class AllRoleRespone {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose()
    description?: string;
}