import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionModule } from './modules/promotions/promotions.module';
import { BlogModule } from './modules/blogs/blogs.module';
import { BannerModule } from './modules/banners/banners.module';
import { MediaModule } from './modules/media/media.module';
import { CmsModule } from './modules/cms/cms.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from './modules/roles/roles.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as crypto from 'crypto';
import { join } from 'path';
import { databaseConfig } from './config/database.config';
import { HttpModule } from '@nestjs/axios';
import { CartsModule } from './modules/carts/carts.module';


(global as any).crypto = crypto;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    AuthModule,
    UsersModule,
    ProductModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
    PromotionModule,
    BlogModule,
    BannerModule,
    MediaModule,
    CmsModule,
    StatisticsModule,
    RolesModule,

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@localhost>',
        },
        template: {
          dir: join(__dirname, '..', 'src', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }