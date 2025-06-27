// src/promotion/schemas/promotion-applicability-rule.schema.ts
import { z } from 'zod';

export const PromotionApplicabilityRuleSchema = z.object({
    id: z.number().int().positive().optional(),
    promotion_id: z.number().int().positive(),
    rule_type: z.enum(['product', 'category', 'user', 'product_variant' as const]),
    entity_id: z.number().int().positive(),
    applicability_type: z.enum(['include', 'exclude' as const]),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
});

export type PromotionApplicabilityRuleDto = z.infer<typeof PromotionApplicabilityRuleSchema>;