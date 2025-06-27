import { Module } from '@nestjs/common';
import { OrderController } from './orders.controller';
import { OrderService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { OrderItem } from '../payments/entities/order-item.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Address } from '../users/entities/address.entity';
import { User } from '../users/entities/user.entity';
import { CartsModule } from '../carts/carts.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderStatusHistory,
      ShippingProvider,
      ProductVariant,
      OrderItem,
      PaymentMethod,
      Address,
      User,
    ]),
    CartsModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],

})
export class OrdersModule { }
