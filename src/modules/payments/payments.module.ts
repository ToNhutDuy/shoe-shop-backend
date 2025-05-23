import { Module } from '@nestjs/common';
import { PaymentMethodsService } from './services/payment_methods.service';
import { PaymentMethodsController } from './controllers/payment-methods.controller';





@Module({
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
})
export class PaymentsModule { }
