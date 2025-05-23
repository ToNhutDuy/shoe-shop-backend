import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CartsService } from './carts.service';


@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) { }


}
