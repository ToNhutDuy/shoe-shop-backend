// src/order/schemas/order-item.schema.ts
import { z } from 'zod';

export const OrderItemSchema = z.object({
    id: z.number().int().positive().optional(),
    order_id: z.number().int().positive(),
    product_variant_id: z.number().int().positive(),
    product_name_snapshot: z.string().max(255),
    variant_sku_snapshot: z.string().max(100),
    unit_price_at_purchase: z.number().refine((val) => !isNaN(val)),
    quantity: z.number().int().min(1),
    line_item_total_amount: z.number().refine((val) => !isNaN(val)),
    line_item_discount_amount: z.number().refine((val) => !isNaN(val)).default(0),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type OrderItemDto = z.infer<typeof OrderItemSchema>;