import { z } from 'zod';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export const CreateOrderItemSchema = z.object({
    product_variant_id: z.number().int().positive(),
    quantity: z.number().int().positive().min(1),
    product_variant_snapshot_text: z.string().max(255).optional().nullable(),
    price_snapshot: z.number().refine((val) => !isNaN(val)).optional(),
});

export type CreateOrderItemDto = z.infer<typeof CreateOrderItemSchema>;

export const CreateOrderFromCartSchema = z.object({
    customer_full_name: z.string().min(1).max(255),
    customer_email: z.string().email().max(255),
    customer_phone_number: z.string().min(1).max(20),
    shipping_address_id: z.number().int().positive().optional().nullable(),
    shipping_address_snapshot_text: z.string().min(1),
    payment_method_id: z.number().int().positive(),
    customer_notes: z.string().nullable().optional(),
});

export type CreateOrderFromCartDto = z.infer<typeof CreateOrderFromCartSchema>;


export const CreateManualOrderSchema = CreateOrderFromCartSchema.extend({
    user_id: z.number().int().positive().optional().nullable(),
    items: z.array(CreateOrderItemSchema).min(1),
});

export type CreateManualOrderDto = z.infer<typeof CreateManualOrderSchema>;

export const UpdateOrderSchema = z.object({
    user_id: z.number().int().positive().optional().nullable(),
    customer_full_name: z.string().max(255).optional(),
    customer_email: z.string().email().max(255).optional(),
    customer_phone_number: z.string().max(20).optional(),
    shipping_address_id: z.number().int().positive().optional().nullable(),
    shipping_address_snapshot_text: z.string().optional(),
    subtotal_amount: z.number().refine((val) => !isNaN(val)).optional(),
    discount_amount: z.number().refine((val) => !isNaN(val)).optional(),
    shipping_fee_amount: z.number().refine((val) => !isNaN(val)).optional(),
    grand_total_amount: z.number().refine((val) => !isNaN(val)).optional(),
    payment_method_id: z.number().int().positive().optional(),
    payment_status: z.nativeEnum(PaymentStatus).optional(),
    order_status_code: z.nativeEnum(OrderStatus).optional(),
    customer_notes: z.string().nullable().optional(),
    internal_notes: z.string().nullable().optional(),
    shipping_provider_id: z.number().int().positive().nullable().optional(),
    tracking_number: z.string().max(100).nullable().optional(),
    estimated_delivery_date: z.string().datetime().nullable().optional().transform((str) => (str ? new Date(str) : null)),
}).partial();

export type UpdateOrderDto = z.infer<typeof UpdateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    new_status_code: z.nativeEnum(OrderStatus),
    notes: z.string().nullable().optional(),
});

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;