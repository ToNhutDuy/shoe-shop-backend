import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment_methods.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { Media } from '../media/entities/media.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentController } from './controllers/payment-methods.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      OrderPayment,
      Media,
      Order,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService, TypeOrmModule],
})
export class PaymentsModule { }
