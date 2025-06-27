import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  Req,
  UsePipes,
} from '@nestjs/common';

import {
  CreateOrderFromCartDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  CreateManualOrderDto,
  CreateOrderFromCartSchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
  CreateManualOrderSchema
} from './schemas/order.schema';
import { CreateShippingProviderDto, UpdateShippingProviderDto, CreateShippingProviderSchema, UpdateShippingProviderSchema } from './schemas/shipping-provider.schema'; // Import Zod schemas
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Order } from './entities/order.entity';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';

import { BadRequestException } from '@nestjs/common';
import { OrderService } from './orders.service';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { OrderStatus } from './enums/order-status.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from '../roles/enums/resource.enum';
import { Action } from '../roles/enums/action.enum';

interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('orders')
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) { }


  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order from the current user/session cart' })
  @ApiResponse({ status: 201, description: 'Order created successfully.', type: Order })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., empty cart, validation failed, out of stock).' })
  @ApiResponse({ status: 404, description: 'Payment method not found.' })
  @UsePipes(new ZodValidationPipe(CreateOrderFromCartSchema))
  async createOrderFromCart(
    @Body() createOrderDto: CreateOrderFromCartDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    const userId = req.user ? req.user.userId : null;
    const sessionId: string | null = (req.headers['x-session-id'] as string) || null;

    if (!userId && !sessionId) {
      throw new BadRequestException('User ID or Session ID is required to create an order.');
    }
    return this.orderService.createOrderFromCart(userId, sessionId, createOrderDto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get all orders for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully.', type: [Order] })
  @ApiResponse({ status: 400, description: 'Bad Request (User not logged in).' })
  async getMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: OrderStatus,
  ): Promise<{ data: Order[]; meta: any }> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to view their orders.');
    }
    return this.orderService.getOrders(req.user.userId, +page, +limit, status);
  }

  @Get(':id')

  async getOrderById(
    @Param('id') id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    const userId = req.user.userId;
    return this.orderService.getOrderById(+id, userId);
  }




  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @Permissions([{ resource: Resource.orders, action: [Action.create] }])
  @UsePipes(new ZodValidationPipe(CreateManualOrderSchema))
  async createManualOrder(
    @Body() createManualOrderDto: CreateManualOrderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    const adminId = req.user ? req.user.userId : null;
    return this.orderService.createManualOrder(createManualOrderDto, adminId);
  }

  @Get()
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: OrderStatus,
  ): Promise<{ data: Order[]; meta: any }> {
    return this.orderService.getOrders(null, +page, +limit, status);
  }


  @Patch(':id')
  @Permissions([{ resource: Resource.orders, action: [Action.update] }])
  @UsePipes(new ZodValidationPipe(UpdateOrderSchema))
  async updateOrder(
    @Param('id') id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    return this.orderService.updateOrder(+id, updateOrderDto);
  }

  @Patch(':id/status')
  @Permissions([{ resource: Resource.orders, action: [Action.update] }])
  @UsePipes(new ZodValidationPipe(UpdateOrderStatusSchema))
  async updateOrderStatus(
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    const changedByUserId = req.user ? req.user.userId : null;
    if (!changedByUserId) {
      throw new BadRequestException('User ID is required to record status change history.');
    }
    return this.orderService.updateOrderStatus(+id, updateStatusDto, changedByUserId);
  }



  @Post('shipping-providers')
  @HttpCode(HttpStatus.CREATED)

  @Permissions([{ resource: Resource.orders, action: [Action.create] }])
  @UsePipes(new ZodValidationPipe(CreateShippingProviderSchema))
  async createShippingProvider(
    @Body() createShippingProviderDto: CreateShippingProviderDto,
  ): Promise<ShippingProvider> {
    return this.orderService.createShippingProvider(createShippingProviderDto);
  }

  @Get('shipping-providers/:id')
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getShippingProviderById(
    @Param('id') id: number,
  ): Promise<ShippingProvider> {
    return this.orderService.getShippingProviderById(+id);
  }

  @Get('shipping-providers')
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getAllShippingProviders(): Promise<ShippingProvider[]> {
    return this.orderService.getAllShippingProviders();
  }

  @Patch('shipping-providers/:id')
  @Permissions([{ resource: Resource.orders, action: [Action.update] }])
  @UsePipes(new ZodValidationPipe(UpdateShippingProviderSchema))
  async updateShippingProvider(
    @Param('id') id: number,
    @Body() updateShippingProviderDto: UpdateShippingProviderDto,
  ): Promise<ShippingProvider> {
    return this.orderService.updateShippingProvider(+id, updateShippingProviderDto);
  }

  @Delete('shipping-providers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([{ resource: Resource.orders, action: [Action.delete] }])
  async deleteShippingProvider(
    @Param('id') id: number,
  ): Promise<void> {
    await this.orderService.deleteShippingProvider(+id);
  }



  @Get(':id/history')
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getOrderStatusHistory(
    @Param('id') id: number,
  ): Promise<OrderStatusHistory[]> {
    return this.orderService.getOrderStatusHistoryByOrderId(+id);
  }
}