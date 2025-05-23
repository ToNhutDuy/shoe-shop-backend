import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator'; // Đảm bảo đường dẫn đúng

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.role) {
            throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này (Vai trò không xác định).');
        }

        const hasPermission = requiredRoles.some((role) => user.role === role);

        if (!hasPermission) {
            throw new ForbiddenException('Bạn không có đủ quyền để thực hiện hành động này.');
        }

        return true;
    }
}