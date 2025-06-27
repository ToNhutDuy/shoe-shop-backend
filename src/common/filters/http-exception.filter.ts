import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestUrl = request?.url ?? 'unknown';

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse = isHttpException
            ? exception.getResponse()
            : null;

        const errorMessage = isHttpException
            ? (exceptionResponse as any)?.message ?? exception.message
            : 'Internal server error';

        const errorDetails = isHttpException && typeof exceptionResponse === 'object'
            ? (exceptionResponse as any).errors
            : undefined;

        if (response.headersSent) {
            this.logger.warn(`[Headers Sent] Cannot send response to ${requestUrl}`, {
                statusCode: status,
                error: exception instanceof Error ? exception.message : String(exception),
                stack: exception instanceof Error ? exception.stack : 'N/A',
            });
            return;
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: requestUrl,
            message: errorMessage,
            ...(errorDetails ? { errors: errorDetails } : {}),
        });
    }
}
