// src/common/dto/pagination-query.zod.ts (hoặc vị trí bạn đã tạo)
import { z } from 'zod';

export const paginationQuerySchema = z.object({
    current: z.string().optional().default('1').transform(val => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 1) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom, // Custom error code
                    path: ['current'],
                    message: 'Tham số "current" phải là một số nguyên dương.',
                },
            ]);
        }
        return num;
    }),
    pageSize: z.string().optional().default('10').transform(val => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 1 || num > 100) {
            throw new z.ZodError([
                {
                    code: z.ZodIssueCode.custom,
                    path: ['pageSize'],
                    message: 'Tham số "pageSize" phải là một số nguyên dương và không quá 100.',
                },
            ]);
        }
        return num;
    }),
    sort: z.string().optional(),
    query: z.string().optional(),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;