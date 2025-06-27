// src/order/schemas/order-status-history.schema.ts
import { z } from 'zod';

export const OrderStatusHistorySchema = z.object({
    id: z.number().int().positive().optional(),
    order_id: z.number().int().positive(),
    previous_status_code: z.string().max(50).nullable().optional(),
    new_status_code: z.string().max(50),
    notes: z.string().nullable().optional(),
    changed_at: z.date(),
    changed_by_user_id: z.number().int().positive().nullable().optional(),
    created_at: z.date().optional(),
});

export type OrderStatusHistoryDto = z.infer<typeof OrderStatusHistorySchema>;