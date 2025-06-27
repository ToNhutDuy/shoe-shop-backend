import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderStatus } from 'src/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '../entities/payment-method.entity';
import { OrderPayment } from '../entities/order-payment.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../schemas/payment-method.schema';
import { CreateOrderPaymentDto } from '../schemas/order-payment.schema';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethodCode } from '../enums/payment-method-code.enum';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        @InjectRepository(PaymentMethod)
        private paymentMethodRepository: Repository<PaymentMethod>,
        @InjectRepository(OrderPayment)
        private orderPaymentRepository: Repository<OrderPayment>,
        @InjectRepository(Order)
        private orderRepository: Repository<Order>, // Inject OrderRepository to update order status/payment_status
    ) { }

    // --- Payment Method Management ---

    async createPaymentMethod(
        createPaymentMethodDto: CreatePaymentMethodDto,
    ): Promise<PaymentMethod> {
        // Check for existing name or code
        const existingMethod = await this.paymentMethodRepository.findOne({
            where: [{ name: createPaymentMethodDto.name }, { code: createPaymentMethodDto.code }],
        });
        if (existingMethod) {
            throw new BadRequestException('Payment method with this name or code already exists.');
        }

        const paymentMethod = this.paymentMethodRepository.create(createPaymentMethodDto);
        try {
            return await this.paymentMethodRepository.save(paymentMethod);
        } catch (error) {
            this.logger.error(`Failed to create payment method: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not create payment method.');
        }
    }

    async getPaymentMethodById(id: number): Promise<PaymentMethod> {
        const method = await this.paymentMethodRepository.findOne({ where: { id } });
        if (!method) {
            throw new NotFoundException(`Payment method with ID ${id} not found.`);
        }
        return method;
    }

    async getAllPaymentMethods(isActive?: boolean): Promise<PaymentMethod[]> {
        const whereClause = isActive !== undefined ? { is_active: isActive } : {};
        return this.paymentMethodRepository.find({ where: whereClause });
    }

    async updatePaymentMethod(
        id: number,
        updatePaymentMethodDto: UpdatePaymentMethodDto,
    ): Promise<PaymentMethod> {
        const method = await this.paymentMethodRepository.findOne({ where: { id } });
        if (!method) {
            throw new NotFoundException(`Payment method with ID ${id} not found.`);
        }

        // Check for duplicate name or code if they are being updated
        if (updatePaymentMethodDto.name && updatePaymentMethodDto.name !== method.name) {
            const existingByName = await this.paymentMethodRepository.findOne({ where: { name: updatePaymentMethodDto.name } });
            if (existingByName && existingByName.id !== id) {
                throw new BadRequestException(`Payment method with name "${updatePaymentMethodDto.name}" already exists.`);
            }
        }
        if (updatePaymentMethodDto.code && updatePaymentMethodDto.code !== method.code) {
            const existingByCode = await this.paymentMethodRepository.findOne({ where: { code: updatePaymentMethodDto.code } });
            if (existingByCode && existingByCode.id !== id) {
                throw new BadRequestException(`Payment method with code "${updatePaymentMethodDto.code}" already exists.`);
            }
        }

        Object.assign(method, updatePaymentMethodDto);
        try {
            return await this.paymentMethodRepository.save(method);
        } catch (error) {
            this.logger.error(`Failed to update payment method ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not update payment method.');
        }
    }

    async deletePaymentMethod(id: number): Promise<void> {
        // Consider soft delete or disallowing deletion if method is in use
        const result = await this.paymentMethodRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Payment method with ID ${id} not found.`);
        }
        this.logger.log(`Deleted payment method ID: ${id}`);
    }

    // --- Order Payment Processing ---

    /**
     * Records a payment for an order.
     * This method is generally for external payment gateway callbacks or manual admin entry.
     * For COD, the payment status is handled differently on order creation.
     */
    async recordOrderPayment(createOrderPaymentDto: CreateOrderPaymentDto): Promise<OrderPayment> {
        const { order_id, payment_method_id, amount_paid, status } = createOrderPaymentDto;

        const order = await this.orderRepository.findOne({ where: { id: order_id } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${order_id} not found.`);
        }

        const paymentMethod = await this.paymentMethodRepository.findOne({ where: { id: payment_method_id } });
        if (!paymentMethod) {
            throw new NotFoundException(`Payment method with ID ${payment_method_id} not found.`);
        }

        // Basic check: Don't process payment for cancelled/returned orders unless specific refund logic
        if (order.order_status_code === OrderStatus.CANCELLED || order.order_status_code === OrderStatus.RETURNED) {
            throw new BadRequestException(`Cannot record payment for order ${order_id} with status "${order.order_status_code}".`);
        }

        // You might want to implement more complex logic here:
        // - Check if amount_paid matches grand_total_amount or remaining balance.
        // - Handle partial payments.
        // - Prevent multiple successful payments for the same order if it's already paid.

        const orderPayment = this.orderPaymentRepository.create(createOrderPaymentDto);
        try {
            await this.orderPaymentRepository.save(orderPayment);

            // Update order's payment_status based on the recorded payment
            if (status === PaymentStatus.PAID) {
                order.payment_status = PaymentStatus.PAID;
                await this.orderRepository.save(order);
                this.logger.log(`Order ${order_id} payment status updated to PAID.`);
            } else if (status === PaymentStatus.FAILED) {
                order.payment_status = PaymentStatus.FAILED;
                await this.orderRepository.save(order);
                this.logger.warn(`Order ${order_id} payment status updated to FAILED.`);
            }
            // Other statuses (PENDING, REFUNDED) might also trigger updates

            return orderPayment;
        } catch (error) {
            this.logger.error(`Failed to record order payment for order ${order_id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not record order payment.');
        }
    }

    async getOrderPaymentById(id: number): Promise<OrderPayment> {
        const orderPayment = await this.orderPaymentRepository.findOne({
            where: { id },
            relations: ['order', 'paymentMethod'],
        });
        if (!orderPayment) {
            throw new NotFoundException(`Order payment with ID ${id} not found.`);
        }
        return orderPayment;
    }

    async getOrderPaymentsByOrderId(orderId: number): Promise<OrderPayment[]> {
        const orderPayments = await this.orderPaymentRepository.find({
            where: { order_id: orderId },
            relations: ['paymentMethod'],
            order: { payment_timestamp: 'ASC' },
        });
        if (orderPayments.length === 0) {
            this.logger.warn(`No payment records found for order ID: ${orderId}`);
            // Return empty array instead of 404 if it's normal for orders to have no payments yet
            return [];
        }
        return orderPayments;
    }

    // --- COD Specific Logic ---

    /**
     * This method would be called internally by OrderService when an order is created with COD.
     * It sets the initial payment status for the order.
     */
    async handleCashOnDeliveryPayment(order: Order, paymentMethod: PaymentMethod): Promise<OrderPayment> {
        if (paymentMethod.code !== PaymentMethodCode.COD) {
            throw new BadRequestException('This method is only for Cash On Delivery payment method.');
        }

        // For COD, the payment status of the order is typically set to PENDING or CASH_ON_DELIVERY (if you use a distinct status)
        // at the time of order creation.
        // We'll record an OrderPayment entry to mark that payment is expected via COD.

        const orderPayment = this.orderPaymentRepository.create({
            order_id: order.id,
            payment_method_id: paymentMethod.id,
            amount_paid: order.grand_total_amount, // Expected amount to be paid
            payment_timestamp: new Date(), // Date when payment is expected/recorded
            status: PaymentStatus.CASH_ON_DELIVERY, // Use the specific COD status
            external_transaction_id: null, // No external ID for COD initially
            gateway_response_details: { notes: 'Payment expected upon delivery' },
        });

        try {
            await this.orderPaymentRepository.save(orderPayment);
            // The order's payment_status and order_status_code are likely set by OrderService during creation
            // order.payment_status = PaymentStatus.CASH_ON_DELIVERY;
            // order.order_status_code = OrderStatus.PENDING_CONFIRMATION; // Or processing
            // await this.orderRepository.save(order); // OrderService handles this save

            this.logger.log(`Recorded COD payment expectation for Order ${order.id}.`);
            return orderPayment;
        } catch (error) {
            this.logger.error(`Failed to handle COD for order ${order.id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not handle Cash On Delivery payment.');
        }
    }

    /**
     * This method would be called by an admin/delivery person when COD payment is actually collected.
     */
    async confirmCashOnDeliveryPayment(orderId: number, adminId: number): Promise<OrderPayment> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }

        // Find the initial COD payment record
        const codPaymentRecord = await this.orderPaymentRepository.findOne({
            where: {
                order_id: orderId,
                status: PaymentStatus.CASH_ON_DELIVERY,
                paymentMethod: { code: PaymentMethodCode.COD } // Filter by COD payment method
            },
            relations: ['paymentMethod']
        });

        if (!codPaymentRecord) {
            throw new BadRequestException(`No pending COD payment record found for order ${orderId}.`);
        }

        if (order.payment_status === PaymentStatus.PAID) {
            throw new BadRequestException(`Order ${orderId} is already marked as PAID.`);
        }

        // Update the payment record status to PAID
        codPaymentRecord.status = PaymentStatus.PAID;
        codPaymentRecord.payment_timestamp = new Date(); // Update timestamp to when it was paid
        codPaymentRecord.gateway_response_details = {
            ...codPaymentRecord.gateway_response_details,
            actual_collection_date: new Date().toISOString(),
            collected_by_admin_id: adminId,
            notes: 'Cash on Delivery payment collected successfully.'
        };

        try {
            await this.orderPaymentRepository.save(codPaymentRecord);

            // Update the order's payment status to PAID
            order.payment_status = PaymentStatus.PAID;
            // You might also transition order status here, e.g., from SHIPPED to DELIVERED
            // if payment confirmation implies delivery. This depends on your workflow.
            await this.orderRepository.save(order);

            this.logger.log(`COD payment for Order ${orderId} confirmed as PAID.`);
            return codPaymentRecord;
        } catch (error) {
            this.logger.error(`Failed to confirm COD payment for order ${orderId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not confirm Cash On Delivery payment.');
        }
    }
}