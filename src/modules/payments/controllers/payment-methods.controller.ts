import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentMethodsService } from '../services/payment_methods.service';




@Controller('payment_methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodService: PaymentMethodsService) { }


}
