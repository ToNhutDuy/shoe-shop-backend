import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE } from 'src/common/decorators/public.decorator';
import { ApiResponse } from 'src/common/responses/api.response';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const message = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) || 'Success';

        return next.handle().pipe(
            map((data) => {

                if (data && typeof data === 'object' && 'status' in data && 'code' in data && 'message' in data) {
                    return data;
                }

                return ApiResponse.ok(data, message);
            }),
        );
    }

}
