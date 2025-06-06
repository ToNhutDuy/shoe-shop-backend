import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema, private stopAtFirstError = true) { }

    transform(value: any, metadata: ArgumentMetadata) {
        const parsedValue = this.schema.safeParse(value);

        if (!parsedValue.success) {
            const errors = parsedValue.error.flatten().fieldErrors;

            // Lấy lỗi đầu tiên mỗi trường
            const firstErrors = Object.fromEntries(
                Object.entries(errors).map(([field, messages]) => [field, messages?.[0] ?? null])
            );

            throw new BadRequestException({
                status: false,
                code: 400,
                data: null,

                message: 'Validation failed',
                errors: firstErrors,
                timestamp: new Date().toISOString(),
            });
        }

        return parsedValue.data; // Trả lại dữ liệu hợp lệ cho controller
    }
}
