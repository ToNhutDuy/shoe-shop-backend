// src/promotion/schemas/flash-sale-product.schema.ts
import { z } from 'zod';

export const FlashSaleProductSchema = z.object({
    id: z.number().int().positive().optional(),
    flash_sale_id: z.number().int().positive(),
    product_variant_id: z.number().int().positive(),
    flash_sale_price: z.number().refine((val) => !isNaN(val)),
    quantity_limit: z.number().int().min(0),
    quantity_sold: z.number().int().min(0).default(0),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type FlashSaleProductDto = z.infer<typeof FlashSaleProductSchema>;