// src/modules/promotions/dto/flash-sale.zod.ts
import { z } from 'zod';

export const createFlashSaleProductSchema = z.object({
    product_variant_id: z.number().int().positive(),
    flash_sale_price: z.number().positive(),
    quantity_limit: z.number().int().positive(),
});

export const updateFlashSaleProductSchema = createFlashSaleProductSchema.partial();

export type CreateFlashSaleProductZodDto = z.infer<typeof createFlashSaleProductSchema>;
export type UpdateFlashSaleProductZodDto = z.infer<typeof updateFlashSaleProductSchema>;


const baseFlashSaleSchema = z.object({
    name: z.string().min(3).max(255),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    is_active: z.boolean().default(true).optional(),
    banner_media_id: z.number().int().positive().nullable().optional(),
});


export const createFlashSaleSchema = baseFlashSaleSchema
    .extend({

        products: z.array(createFlashSaleProductSchema).min(1, "Flash sale must include at least one product.").optional(),
    })
    .refine(data => {

        if (data.starts_at && data.ends_at) {
            return new Date(data.ends_at) > new Date(data.starts_at);
        }
        return true;
    }, {
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
    });

export const updateFlashSaleSchema = baseFlashSaleSchema
    .partial()
    .extend({

        products: z.array(z.union([
            createFlashSaleProductSchema,
            updateFlashSaleProductSchema.extend({ id: z.number().int().positive() })
        ])).optional(),
    })
    .refine(data => {

        if (data.starts_at && data.ends_at) {
            return new Date(data.ends_at) > new Date(data.starts_at);
        }
        return true;
    }, {
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
    });


export type CreateFlashSaleZodDto = z.infer<typeof createFlashSaleSchema>;
export type UpdateFlashSaleZodDto = z.infer<typeof updateFlashSaleSchema>;
