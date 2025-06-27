import { z } from 'zod';
import { Resource } from '../../enums/resource.enum';
import { Action } from '../../enums/action.enum';


export const PermissionSchema = z.object({
    resource: z.nativeEnum(Resource),
    action: z.array(z.nativeEnum(Action)).min(1, "At least one action is required"),
});

export const CreateRoleSchema = z.object({
    name: z.string().min(1, "Role name cannot be empty"),
    permissions: z.array(PermissionSchema).optional(),
});

export const UpdateRoleSchema = z.object({
    name: z.string().min(1, "Role name cannot be empty").optional(),
});


export const AddPermissionToRoleSchema = z.object({
    resource: z.nativeEnum(Resource),
    action: z.array(z.nativeEnum(Action)).min(1, "At least one action is required"),
});


// export const RemovePermissionFromRoleSchema = z.object({
//   rolePermissionId: z.number().int().positive("rolePermissionId must be a positive integer"),
// });