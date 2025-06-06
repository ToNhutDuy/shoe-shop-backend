import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        console.log('INSIDE JWT AUTH GUARD');
        // Kiểm tra xem route có được đánh dấu là @Public() không
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true; // Nếu là public, cho phép truy cập mà không cần xác thực
        }

        // Gọi phương thức canActivate của lớp cha (AuthGuard từ @nestjs/passport)
        // để thực hiện xác thực JWT thông qua JwtStrategy
        return super.canActivate(context);
    }

    // Xử lý kết quả từ JwtStrategy
    handleRequest(err, user, info) {
        // Nếu có lỗi hoặc không có user (tức là xác thực thất bại)
        if (err || !user) {
            // Log info để hiểu rõ lỗi hơn trong quá trình debug
            console.log('JWT Auth Guard Error:', err);
            console.log('JWT Auth Guard User:', user);
            console.log('JWT Auth Guard Info:', info);

            throw err || new UnauthorizedException('Access token không hợp lệ hoặc không có tại header');
        }
        // Trả về đối tượng user đã được xác thực (được trả về từ JwtStrategy.validate)
        // Đối tượng này sẽ được gán vào `request.user`
        return user;
    }
}