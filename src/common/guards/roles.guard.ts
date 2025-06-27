import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from 'src/modules/users/users.service';
import { Request } from 'express';


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private usersService: UsersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const request = context.switchToHttp().getRequest();
            console.log('INSIDE ROLES GUARD');
            console.log('Request user object from JwtAuthGuard:', request.user);

            if (!request.user || !request.user.id) {
                throw new UnauthorizedException('Không tìm thấy id user tại RolesGuard');
            }
            const requiredPermissions = this.reflector.getAllAndOverride<any[]>(PERMISSIONS_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            console.log('Required permissions for route:', requiredPermissions);

            if (!requiredPermissions || requiredPermissions.length === 0) {
                return true;
            }

            const userWithPermissions = await this.usersService.getUserPermissions(request.user.id);
            const userPermissions = userWithPermissions.permissions || [];
            console.log('User permissions:', userPermissions);

            const hasPermission = requiredPermissions.every((requiredPerm) => {
                return userPermissions.some((userPerm) => {
                    if (userPerm.resource !== requiredPerm.resource) {
                        return false;
                    }
                    return requiredPerm.action.every((act: string) => userPerm.action.includes(act));
                });
            });

            if (!hasPermission) {
                throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
            }

            return true;
        } catch (error) {
            console.error('Error in RolesGuard:', error);
            throw error;
        }
    }
}