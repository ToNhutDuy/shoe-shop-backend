import {
  Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode, Query, UsePipes, Req,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from '../services/payment_methods.service';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from 'src/modules/roles/enums/resource.enum';
import { Action } from 'src/modules/roles/enums/action.enum';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { CreatePaymentMethodDto, CreatePaymentMethodSchema, UpdatePaymentMethodDto, UpdatePaymentMethodSchema } from '../schemas/payment-method.schema';
import { PaymentMethod } from '../entities/payment-method.entity';
import { CreateOrderPaymentDto, CreateOrderPaymentSchema } from '../schemas/order-payment.schema';
import { OrderPayment } from '../entities/order-payment.entity';

interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
}


interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('payments')
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }



  @Post('methods')
  @HttpCode(HttpStatus.CREATED)
  @Permissions([{ resource: Resource.payments, action: [Action.create] }])
  @UsePipes(new ZodValidationPipe(CreatePaymentMethodSchema))
  async createPaymentMethod(
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.paymentService.createPaymentMethod(createPaymentMethodDto);
  }

  @Get('methods/:id')
  @Permissions([{ resource: Resource.payments, action: [Action.read] }])
  async getPaymentMethodById(@Param('id') id: number): Promise<PaymentMethod> {
    return this.paymentService.getPaymentMethodById(+id);
  }

  @Get('methods')

  async getAllPaymentMethods(@Query('is_active') isActive?: string): Promise<PaymentMethod[]> {
    let activeFilter: boolean | undefined = undefined;
    if (isActive === 'true') activeFilter = true;
    if (isActive === 'false') activeFilter = false;
    return this.paymentService.getAllPaymentMethods(activeFilter);
  }

  @Patch('methods/:id')

  @Permissions([{ resource: Resource.payments, action: [Action.update] }])
  @UsePipes(new ZodValidationPipe(UpdatePaymentMethodSchema))
  async updatePaymentMethod(
    @Param('id') id: number,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    return this.paymentService.updatePaymentMethod(+id, updatePaymentMethodDto);
  }

  @Delete('methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([{ resource: Resource.payments, action: [Action.delete] }])
  async deletePaymentMethod(@Param('id') id: number): Promise<void> {
    await this.paymentService.deletePaymentMethod(+id);
  }



  @Post('order-payments')
  @HttpCode(HttpStatus.CREATED)
  @Permissions([{ resource: Resource.orders, action: [Action.create] }])
  @UsePipes(new ZodValidationPipe(CreateOrderPaymentSchema))
  async recordOrderPayment(@Body() createOrderPaymentDto: CreateOrderPaymentDto): Promise<OrderPayment> {
    return this.paymentService.recordOrderPayment(createOrderPaymentDto);
  }

  @Get('order-payments/:id')
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getOrderPaymentById(@Param('id') id: number): Promise<OrderPayment> {
    return this.paymentService.getOrderPaymentById(+id);
  }

  @Get('orders/:orderId/payments')
  @Permissions([{ resource: Resource.orders, action: [Action.read] }])
  async getOrderPaymentsByOrderId(@Param('orderId') orderId: number): Promise<OrderPayment[]> {
    return this.paymentService.getOrderPaymentsByOrderId(+orderId);
  }



  @Post('cod/:orderId/confirm')
  @HttpCode(HttpStatus.OK)
  @Permissions([{ resource: Resource.orders, action: [Action.update] }])
  async confirmCashOnDeliveryPayment(
    @Param('orderId') orderId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderPayment> {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new BadRequestException('Authenticated user ID is required to confirm COD payment.');
    }
    return this.paymentService.confirmCashOnDeliveryPayment(+orderId, adminId);
  }
}