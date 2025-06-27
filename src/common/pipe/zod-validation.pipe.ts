// src/common/pipe/zod-validation.pipe.ts

import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ZodError, ZodSchema } from "zod";


@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) { }

    transform(value: unknown) {

        try {
            const parsedValue = this.schema.parse(value);
            return parsedValue;
        } catch (error) {
            if (error instanceof ZodError) {
                console.error('Zod Validation Error details:', error.errors);

                const errors = error.errors.map(err => ({

                    path: Array.isArray(err.path) && err.path.length > 0
                        ? err.path.join('.')
                        : 'general',
                    message: err.message,
                }));

                throw new BadRequestException({
                    statusCode: 400,
                    timestamp: new Date().toISOString(),
                    path: '',
                    message: 'Validation failed',
                    errors: errors.reduce((acc, err) => {
                        acc[err.path] = err.message;
                        return acc;
                    }, {}),
                });
            }
            throw new BadRequestException('Validation failed');
        }
    }
}