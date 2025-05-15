import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { BannersModule } from './modules/banners/banners.module';
import { MediaModule } from './modules/media/media.module';
import { CmsModule } from './modules/cms/cms.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import 'dotenv/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot({
    type: process.env.DB_DRIVER as any,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  }), AuthModule, UsersModule, ProductsModule, CartModule, OrdersModule, PaymentModule, PromotionsModule, BlogsModule, BannersModule, MediaModule, CmsModule, StatisticsModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
