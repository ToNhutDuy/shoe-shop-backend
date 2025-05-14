import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentMethodService } from '../services/payment-method.service';


@Controller('payment_methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) { }


}
