// src/payment/schemas/payment-method.schema.ts
import { z } from 'zod';
import { PaymentMethodCode } from '../enums/payment-method-code.enum';

export const CreatePaymentMethodSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.nativeEnum(PaymentMethodCode, {
        errorMap: () => ({ message: 'Invalid payment method code' }),
    }), // Ensure code is from our enum
    logo_media_id: z.number().int().positive().optional().nullable(),
    description: z.string().nullable().optional(),
    api_configuration: z.record(z.any()).nullable().optional(), // Flexible JSON object for API configs
    is_active: z.boolean().default(true).optional(),
});

export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.nativeEnum(PaymentMethodCode, {
        errorMap: () => ({ message: 'Invalid payment method code' }),
    }).optional(),
    logo_media_id: z.number().int().positive().optional().nullable(),
    description: z.string().nullable().optional(),
    api_configuration: z.record(z.any()).nullable().optional(),
    is_active: z.boolean().optional(),
}).partial(); // All fields are optional for update

export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethodSchema>;