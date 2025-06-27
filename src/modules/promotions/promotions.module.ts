// src/promotion/promotion.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { FlashSale } from './entities/flash-sale.entity';
import { FlashSaleProduct } from './entities/flash-sale-product.entity';
import { OrderPromotion } from './entities/order-promotion.entity';
import { PromotionApplicabilityRule } from './entities/promotion-applicability-rule.entity';
import { PromotionService } from './services/promotion.service';
import { FlashSaleService } from './services/flash-sale.service';
import { FlashSaleController } from './controllers/flash-sale.controller';
import { PromotionController } from './controllers/promotions.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      FlashSale,
      FlashSaleProduct,
      OrderPromotion,
      PromotionApplicabilityRule,
    ]),
    UsersModule
  ],
  controllers: [PromotionController, FlashSaleController],
  providers: [PromotionService, FlashSaleService],
  exports: [PromotionService, FlashSaleService],
})
export class PromotionModule { }
