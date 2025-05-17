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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from './modules/role/role.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as crypto from 'crypto';
(global as any).crypto = crypto;
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      type: configService.get<string>('DB_DRIVER') as 'mysql' | 'postgres' | 'sqlite' | 'mariadb',
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT'),
      username: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_DATABASE'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
  }),
    AuthModule, UsersModule, ProductsModule, CartModule, OrdersModule,
    PaymentModule, PromotionsModule, BlogsModule, BannersModule,
    MediaModule, CmsModule, StatisticsModule, RoleModule,

  MailerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        // ignoreTLS: true,
        // secure: true,
        auth: {
          user: configService.get<string>('MAIL_USER'),
          pass: configService.get<string>('MAIL_PASSWORD'),
        },
      },
      defaults: {
        from: '"No Reply" <no-reply@localhost>',
      },
      // preview: true,
      // template: {
      //   dir: process.cwd() + '/template/',
      //   adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
      //   options: {
      //     strict: true,
      //   },
      // },
    }),
  }),],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },],
})
export class AppModule { }
