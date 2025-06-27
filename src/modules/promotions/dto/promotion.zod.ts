// src/modules/promotions/dto/promotion.zod.ts
import { z } from 'zod';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED_AMOUNT_ORDER = 'fixed_amount_order',
    FREE_SHIPPING = 'free_shipping',
}

export enum RuleType {
    PRODUCT = 'product',
    CATEGORY = 'category',
    USER = 'user',
    PRODUCT_VARIANT = 'product_variant',
}

export enum ApplicabilityType {
    INCLUDE = 'include',
    EXCLUDE = 'exclude',
}


export const createPromotionApplicabilityRuleSchema = z.object({
    rule_type: z.nativeEnum(RuleType, {
        errorMap: () => ({ message: `Rule type must be one of: ${Object.values(RuleType).join(', ')}` }),
    }),
    entity_id: z.number().int().positive(),
    applicability_type: z.nativeEnum(ApplicabilityType, {
        errorMap: () => ({ message: `Applicability type must be one of: ${Object.values(ApplicabilityType).join(', ')}` }),
    }),
});


export const updateExistingPromotionApplicabilityRuleSchema = z.object({
    id: z.number().int().positive(),
    rule_type: z.nativeEnum(RuleType, {
        errorMap: () => ({ message: `Rule type must be one of: ${Object.values(RuleType).join(', ')}` }),
    }).optional(),
    entity_id: z.number().int().positive().optional(),
    applicability_type: z.nativeEnum(ApplicabilityType, {
        errorMap: () => ({ message: `Applicability type must be one of: ${Object.values(ApplicabilityType).join(', ')}` }),
    }).optional(),
}).partial();


export type CreatePromotionApplicabilityRuleZodDto = z.infer<typeof createPromotionApplicabilityRuleSchema>;
export type UpdatePromotionApplicabilityRuleZodDto = z.infer<typeof updateExistingPromotionApplicabilityRuleSchema>;


const basePromotionSchema = z.object({
    code: z.string().min(3).max(50),
    description: z.string().max(1000).nullable().optional(),
    discount_type: z.nativeEnum(DiscountType, {
        errorMap: () => ({ message: `Discount type must be one of: ${Object.values(DiscountType).join(', ')}` }),
    }),
    discount_value: z.number().positive(),
    minimum_order_value: z.number().positive().nullable().optional(),
    maximum_usage_limit: z.number().int().positive().nullable().optional(),
    usage_limit_per_user: z.number().int().positive().nullable().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    is_active: z.boolean().default(true).optional(),
});

export const createPromotionSchema = basePromotionSchema
    .extend({
        applicabilityRules: z.array(createPromotionApplicabilityRuleSchema).optional(),
    })
    .refine(data => {

        if (new Date(data.starts_at) >= new Date(data.ends_at)) {
            return false;
        }
        return true;
    }, {
        message: "starts_at must be before ends_at",
        path: ["starts_at", "ends_at"],
    });

export const updatePromotionSchema = basePromotionSchema
    .partial()
    .extend({

        applicabilityRules: z.array(z.union([
            createPromotionApplicabilityRuleSchema,
            updateExistingPromotionApplicabilityRuleSchema
        ])).optional(),
    })
    .refine(data => {

        if (data.starts_at && data.ends_at) {
            return new Date(data.starts_at) < new Date(data.ends_at);
        }
        return true;
    }, {
        message: "starts_at must be before ends_at when updating",
        path: ["starts_at", "ends_at"],
    });


export type CreatePromotionZodDto = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionZodDto = z.infer<typeof updatePromotionSchema>;
