import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { ShippingProvider } from './entities/shipping-provider.entity';
import {
    CreateOrderFromCartDto,
    UpdateOrderDto,
    UpdateOrderStatusDto,
    CreateManualOrderDto,
} from './schemas/order.schema'; 
import {
    CreateShippingProviderDto,
    UpdateShippingProviderDto,
} from './schemas/shipping-provider.schema'; 

import { OrderItem } from 'src/modules/payments/entities/order-item.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { Address } from 'src/modules/users/entities/address.entity';
import { PaymentMethod } from 'src/modules/payments/entities/payment-method.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { CartService } from '../carts/carts.service';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(OrderStatusHistory)
        private orderStatusHistoryRepository: Repository<OrderStatusHistory>,
        @InjectRepository(ShippingProvider)
        private shippingProviderRepository: Repository<ShippingProvider>,
        @InjectRepository(ProductVariant)
        private productVariantRepository: Repository<ProductVariant>,
        @InjectRepository(Address)
        private addressRepository: Repository<Address>,
        @InjectRepository(PaymentMethod)
        private paymentMethodRepository: Repository<PaymentMethod>,
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
        private cartService: CartService,
        private dataSource: DataSource,
    ) { }


    async createOrderFromCart(
        userId: number | null,
        sessionId: string | null,
        createOrderDto: CreateOrderFromCartDto,
    ): Promise<Order> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const {
                customer_email,
                customer_full_name,
                customer_phone_number,
                shipping_address_id,
                shipping_address_snapshot_text,
                payment_method_id,
                customer_notes,
            } = createOrderDto;

            const paymentMethod = await queryRunner.manager.findOne(PaymentMethod, { where: { id: payment_method_id } });
            if (!paymentMethod) {
                throw new NotFoundException(`Payment method with ID ${payment_method_id} not found.`);
            }

            const cartItems = await this.cartService.getCartItems(userId, sessionId);
            if (cartItems.length === 0) {
                throw new BadRequestException('Cannot create an order from an empty cart.');
            }

            let subtotal_amount = 0;
            const orderItemsToSave: OrderItem[] = []; 

            for (const cartItem of cartItems) {
                const productVariant = await queryRunner.manager.findOne(ProductVariant, {
                    where: { id: cartItem.product_variant_id },
                    relations: ['product'], 
                });

                if (!productVariant || productVariant.stock_quantity < cartItem.quantity || !productVariant.is_active) {
                    throw new BadRequestException(
                        `Product variant ${cartItem.product_variant_id} is out of stock, inactive, or not found. Requested: ${cartItem.quantity}, Available: ${productVariant?.stock_quantity || 0}`,
                    );
                }

                productVariant.stock_quantity -= cartItem.quantity;
                await queryRunner.manager.save(productVariant);

                const unitPriceAtPurchase = productVariant.selling_price;
                const lineItemTotalAmount = unitPriceAtPurchase * cartItem.quantity;
                const lineItemDiscountAmount = 0; 

                subtotal_amount += lineItemTotalAmount;

                const orderItem = this.orderItemRepository.create({
                    product_variant_id: cartItem.product_variant_id,
                    quantity: cartItem.quantity,
                    unit_price_at_purchase: unitPriceAtPurchase, 
                    product_name_snapshot: productVariant.product.name, 
                    variant_sku_snapshot: productVariant.variant_sku, 
                    line_item_total_amount: lineItemTotalAmount,
                    line_item_discount_amount: lineItemDiscountAmount,
                });
                orderItemsToSave.push(orderItem);
            }

            const shipping_fee_amount = 0; 
            const discount_amount = 0; 
            const grand_total_amount = subtotal_amount - discount_amount + shipping_fee_amount;

            const order_code = this.generateOrderCode();

            const order = this.orderRepository.create({
                order_code,
                user_id: userId,
                customer_email,
                customer_full_name,
                customer_phone_number,
                shipping_address_id,
                shipping_address_snapshot_text,
                subtotal_amount,
                discount_amount,
                shipping_fee_amount,
                grand_total_amount,
                payment_method_id,
                payment_status: PaymentStatus.PENDING,
                order_status_code: OrderStatus.PENDING_CONFIRMATION,
                customer_notes,
                placed_at: new Date(),
            });

            if (userId) {
                const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
                if (user) {
                    order.user = user;
                } else {
                    this.logger.warn(`User with ID ${userId} not found for order ${order_code}. Setting user_id to null.`);
                    order.user_id = null;
                }
            }

            if (shipping_address_id) {
                const shippingAddress = await queryRunner.manager.findOne(Address, { where: { id: shipping_address_id } });
                if (shippingAddress) {

                    order.shippingAddress = shippingAddress;
                } else {
                    this.logger.warn(`Shipping address with ID ${shipping_address_id} not found for order ${order_code}.`);
                    order.shipping_address_id = null; 
                }
            }

            await queryRunner.manager.save(order);
            for (const item of orderItemsToSave) {
                item.order = order; 
                await queryRunner.manager.save(item);
            }

            const statusHistory = this.orderStatusHistoryRepository.create({
                order_id: order.id,
                previous_status_code: null,
                new_status_code: order.order_status_code,
                notes: 'Order placed',
                changed_at: new Date(),
                changed_by_user_id: userId,
            });
            await queryRunner.manager.save(statusHistory);

            await this.cartService.clearCart(userId, sessionId);

            await queryRunner.commitTransaction();
            this.logger.log(`Order ${order_code} created successfully.`);
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to create order: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not create order.');
        } finally {
            await queryRunner.release();
        }
    }

    async createManualOrder(
        createManualOrderDto: CreateManualOrderDto,
        adminId: number | null,
    ): Promise<Order> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const {
                customer_email,
                customer_full_name,
                customer_phone_number,
                shipping_address_id,
                shipping_address_snapshot_text,
                payment_method_id,
                customer_notes,
                items,
            } = createManualOrderDto;

            const paymentMethod = await queryRunner.manager.findOne(PaymentMethod, { where: { id: payment_method_id } });
            if (!paymentMethod) {
                throw new NotFoundException(`Payment method with ID ${payment_method_id} not found.`);
            }

            let subtotal_amount = 0;
            const orderItemsToSave: OrderItem[] = [];

            for (const itemDto of items) {
                const productVariant = await queryRunner.manager.findOne(ProductVariant, {
                    where: { id: itemDto.product_variant_id },
                    relations: ['product'], // Load product for snapshot text
                });

                if (!productVariant || productVariant.stock_quantity < itemDto.quantity || !productVariant.is_active) {
                    throw new BadRequestException(
                        `Product variant ${itemDto.product_variant_id} is out of stock, inactive, or not found. Requested: ${itemDto.quantity}, Available: ${productVariant?.stock_quantity || 0}`,
                    );
                }

                productVariant.stock_quantity -= itemDto.quantity;
                await queryRunner.manager.save(productVariant);

                const unitPriceAtPurchase = itemDto.price_snapshot || productVariant.selling_price;
                const lineItemTotalAmount = unitPriceAtPurchase * itemDto.quantity;
                const lineItemDiscountAmount = 0;

                subtotal_amount += lineItemTotalAmount;

                const orderItem = this.orderItemRepository.create({
                    product_variant_id: itemDto.product_variant_id,
                    quantity: itemDto.quantity,
                    unit_price_at_purchase: unitPriceAtPurchase, 
                    product_name_snapshot: productVariant.product.name, 
                    variant_sku_snapshot: productVariant.variant_sku, 
                    line_item_total_amount: lineItemTotalAmount,
                    line_item_discount_amount: lineItemDiscountAmount,
                });
                orderItemsToSave.push(orderItem);
            }

            const shipping_fee_amount = 0;
            const discount_amount = 0;
            const grand_total_amount = subtotal_amount - discount_amount + shipping_fee_amount;

            const order_code = this.generateOrderCode();

            const order = this.orderRepository.create({
                order_code,
                user_id: createManualOrderDto.user_id || null,
                customer_email,
                customer_full_name,
                customer_phone_number,
                shipping_address_id,
                shipping_address_snapshot_text,
                subtotal_amount,
                discount_amount,
                shipping_fee_amount,
                grand_total_amount,
                payment_method_id,
                payment_status: PaymentStatus.PENDING,
                order_status_code: OrderStatus.PENDING_CONFIRMATION,
                customer_notes,
                internal_notes: `Manually created by admin ID: ${adminId || 'N/A'}`,
                placed_at: new Date(),
            });

            if (createManualOrderDto.user_id) {
                const user = await queryRunner.manager.findOne(User, { where: { id: createManualOrderDto.user_id } });
                if (user) {
                    order.user = user;
                } else {
                    this.logger.warn(`User with ID ${createManualOrderDto.user_id} not found for manual order ${order_code}. Setting user_id to null.`);
                    order.user_id = null;
                }
            }

            if (shipping_address_id) {
                const shippingAddress = await queryRunner.manager.findOne(Address, { where: { id: shipping_address_id } });
                if (shippingAddress) {
                    order.shippingAddress = shippingAddress;
                } else {
                    this.logger.warn(`Shipping address with ID ${shipping_address_id} not found for order ${order_code}.`);
                    order.shipping_address_id = null;
                }
            }

            await queryRunner.manager.save(order);

            for (const item of orderItemsToSave) {
                item.order = order; 
                await queryRunner.manager.save(item);
            }

            const statusHistory = this.orderStatusHistoryRepository.create({
                order_id: order.id,
                previous_status_code: null,
                new_status_code: order.order_status_code,
                notes: 'Order manually created by admin',
                changed_at: new Date(),
                changed_by_user_id: adminId,
            });
            await queryRunner.manager.save(statusHistory);

            await queryRunner.commitTransaction();
            this.logger.log(`Manual order ${order_code} created successfully.`);
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to create manual order: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error; 
            }
            throw new InternalServerErrorException('Could not create manual order.');
        } finally {
            await queryRunner.release();
        }
    }

    async getOrderById(orderId: number, userId?: number): Promise<Order> {
        const whereClause: any = { id: orderId };
        if (userId) {
            whereClause.user_id = userId;
        }
        const order = await this.orderRepository.findOne({
            where: whereClause,
            relations: [
                'user',
                'shippingAddress',
                'paymentMethod',
                'shippingProvider',
                'orderItems',
                'orderItems.productVariant',
                'orderItems.productVariant.product',
                'statusHistory',
                'statusHistory.changedByUser',
                'orderPayments',
                'orderPromotions',
            ],
            order: {
                statusHistory: { changed_at: 'ASC' },
            },
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }
        return order;
    }

    async getOrders(
        userId: number | null,
        page: number = 1,
        limit: number = 10,
        status?: OrderStatus,
    ): Promise<{ data: Order[]; meta: any }> {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (userId) {
            where.user_id = userId;
        }
        if (status) {
            where.order_status_code = status;
        }

        const [orders, totalItems] = await this.orderRepository.findAndCount({
            where,
            relations: ['orderItems', 'orderItems.productVariant', 'paymentMethod', 'shippingProvider'],
            order: { placed_at: 'DESC' },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: orders,
            meta: {
                currentPage: page,
                itemCount: orders.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async updateOrder(orderId: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }

        Object.assign(order, updateOrderDto);

        try {
            return await this.orderRepository.save(order);
        } catch (error) {
            this.logger.error(`Failed to update order ${orderId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not update order.');
        }
    }

    async updateOrderStatus(
        orderId: number,
        updateOrderStatusDto: UpdateOrderStatusDto,
        changedByUserId: number,
    ): Promise<Order> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const order = await queryRunner.manager.findOne(Order, { where: { id: orderId } });
            if (!order) {
                throw new NotFoundException(`Order with ID ${orderId} not found.`);
            }

            const oldStatusCode = order.order_status_code as OrderStatus; 
            const newStatusCode = updateOrderStatusDto.new_status_code; 

            if (oldStatusCode === newStatusCode) {
                throw new BadRequestException(`Order ${orderId} is already in status "${newStatusCode}".`);
            }

            this.validateStatusTransition(oldStatusCode, newStatusCode); 

            order.order_status_code = newStatusCode;
            await queryRunner.manager.save(order);

            const statusHistory = this.orderStatusHistoryRepository.create({
                order_id: order.id,
                previous_status_code: oldStatusCode,
                new_status_code: newStatusCode,
                notes: updateOrderStatusDto.notes,
                changed_at: new Date(),
                changed_by_user_id: changedByUserId,
            });
            await queryRunner.manager.save(statusHistory);

            if (newStatusCode === OrderStatus.CANCELLED || newStatusCode === OrderStatus.RETURNED) {
                await this.revertStockForOrder(order.id, queryRunner.manager);
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Order ${orderId} status changed from ${oldStatusCode} to ${newStatusCode}.`);
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to update order status ${orderId}: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Could not update order status.');
        } finally {
            await queryRunner.release();
        }
    }

    private generateOrderCode(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `ORD-${timestamp}-${random}`;
    }

    private validateStatusTransition(oldStatus: OrderStatus, newStatus: OrderStatus): void {
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PENDING_CONFIRMATION]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
            [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
            [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
            [OrderStatus.CANCELLED]: [], 
            [OrderStatus.RETURNED]: [], 
        };

        const allowedNextStatuses = validTransitions[oldStatus];

        if (!allowedNextStatuses || !allowedNextStatuses.includes(newStatus)) {
            throw new BadRequestException(`Invalid status transition: from "${oldStatus}" to "${newStatus}".`);
        }
    }

    private async revertStockForOrder(orderId: number, manager: QueryRunner['manager']): Promise<void> {
        const orderItems = await manager.find(OrderItem, { where: { order_id: orderId } });
        for (const item of orderItems) {
            const productVariant = await manager.findOne(ProductVariant, { where: { id: item.product_variant_id } });
            if (productVariant) {
                productVariant.stock_quantity += item.quantity;
                await manager.save(productVariant);
                this.logger.log(`Reverted stock for product variant ${item.product_variant_id}: +${item.quantity}`);
            } else {
                this.logger.warn(`Product variant ${item.product_variant_id} not found while reverting stock for order ${orderId}.`);
            }
        }
    }


    async createShippingProvider(createShippingProviderDto: CreateShippingProviderDto): Promise<ShippingProvider> {
        const existingProvider = await this.shippingProviderRepository.findOne({ where: { name: createShippingProviderDto.name } });
        if (existingProvider) {
            throw new BadRequestException(`Shipping provider with name "${createShippingProviderDto.name}" already exists.`);
        }
        const provider = this.shippingProviderRepository.create(createShippingProviderDto);
        try {
            return await this.shippingProviderRepository.save(provider);
        } catch (error) {
            this.logger.error(`Failed to create shipping provider: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not create shipping provider.');
        }
    }

    async getShippingProviderById(id: number): Promise<ShippingProvider> {
        const provider = await this.shippingProviderRepository.findOne({ where: { id } });
        if (!provider) {
            throw new NotFoundException(`Shipping provider with ID ${id} not found.`);
        }
        return provider;
    }

    async getAllShippingProviders(): Promise<ShippingProvider[]> {
        return this.shippingProviderRepository.find();
    }

    async updateShippingProvider(id: number, updateShippingProviderDto: UpdateShippingProviderDto): Promise<ShippingProvider> {
        const provider = await this.shippingProviderRepository.findOne({ where: { id } });
        if (!provider) {
            throw new NotFoundException(`Shipping provider with ID ${id} not found.`);
        }
        Object.assign(provider, updateShippingProviderDto);
        try {
            return await this.shippingProviderRepository.save(provider);
        } catch (error) {
            this.logger.error(`Failed to update shipping provider ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not update shipping provider.');
        }
    }

    async deleteShippingProvider(id: number): Promise<void> {
        const result = await this.shippingProviderRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Shipping provider with ID ${id} not found.`);
        }
        this.logger.log(`Deleted shipping provider ID: ${id}`);
    }


    async getOrderStatusHistoryByOrderId(orderId: number): Promise<OrderStatusHistory[]> {
        const history = await this.orderStatusHistoryRepository.find({
            where: { order_id: orderId },
            relations: ['changedByUser'],
            order: { changed_at: 'ASC' },
        });
        if (history.length === 0) {
            throw new NotFoundException(`No status history found for order with ID ${orderId}.`);
        }
        return history;
    }
}