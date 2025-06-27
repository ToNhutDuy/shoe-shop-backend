import { z } from 'zod';

export const paginationQuerySchema = z.object({
    current: z.preprocess(
        (val) => (val === '' ? undefined : parseInt(z.string().parse(val), 10)),
        z.number().int().positive().default(1).optional()
    ),
    pageSize: z.preprocess(
        (val) => (val === '' ? undefined : parseInt(z.string().parse(val), 10)),
        z.number().int().positive().default(10).optional()
    ),
    search: z.string().optional(),
    sort: z.string().optional(),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;