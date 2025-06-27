// src/payment/schemas/order-payment.schema.ts
import { z } from 'zod';
import { PaymentStatus } from '../enums/payment-status.enum';

export const CreateOrderPaymentSchema = z.object({
    order_id: z.number().int().positive(),
    payment_method_id: z.number().int().positive(),
    external_transaction_id: z.string().max(255).nullable().optional(),
    amount_paid: z.number().refine((val) => !isNaN(val)),
    payment_timestamp: z.string().datetime().transform((str) => new Date(str)), // Date string to Date object
    status: z.nativeEnum(PaymentStatus, {
        errorMap: () => ({ message: 'Invalid payment status' }),
    }),
    gateway_response_details: z.record(z.any()).nullable().optional(),
});

export type CreateOrderPaymentDto = z.infer<typeof CreateOrderPaymentSchema>;

export const UpdateOrderPaymentSchema = z.object({
    external_transaction_id: z.string().max(255).nullable().optional(),
    amount_paid: z.number().refine((val) => !isNaN(val)).optional(),
    payment_timestamp: z.string().datetime().transform((str) => new Date(str)).optional(),
    status: z.nativeEnum(PaymentStatus, {
        errorMap: () => ({ message: 'Invalid payment status' }),
    }).optional(),
    gateway_response_details: z.record(z.any()).nullable().optional(),
}).partial();

export type UpdateOrderPaymentDto = z.infer<typeof UpdateOrderPaymentSchema>;