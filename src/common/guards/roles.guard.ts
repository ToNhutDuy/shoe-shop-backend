import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from 'src/modules/users/users.service';
import { Request } from 'express'; // Có thể import nếu cần typing chi tiết hơn


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
            console.log('Request user object from JwtAuthGuard:', request.user); // Kiểm tra đối tượng user từ JwtAuthGuard

            // Kiểm tra xem request.user có tồn tại và có thuộc tính 'id' (hoặc 'userId') không
            // Dựa trên JwtStrategy đã sửa, chúng ta trả về `id: payload.sub`,
            // nên `request.user.id` sẽ là nơi ID người dùng được lưu trữ.
            if (!request.user || !request.user.id) { // <-- Sử dụng request.user.id
                throw new UnauthorizedException('Không tìm thấy id user tại RolesGuard');
            }

            // Lấy danh sách quyền được yêu cầu của route (có thể là mảng PermissionDefinition)
            const requiredPermissions = this.reflector.getAllAndOverride<any[]>(PERMISSIONS_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            console.log('Required permissions for route:', requiredPermissions);

            // Nếu route không yêu cầu quyền gì thì cho phép
            if (!requiredPermissions || requiredPermissions.length === 0) {
                return true;
            }

            // Lấy quyền của user từ service bằng request.user.id
            const userWithPermissions = await this.usersService.getUserPermissions(request.user.id); // <-- Sử dụng request.user.id
            const userPermissions = userWithPermissions.permissions || [];
            console.log('User permissions:', userPermissions);

            // Kiểm tra user có đủ tất cả quyền yêu cầu không
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
            throw error; // Rethrow để NestJS trả lỗi tương ứng
        }
    }
}