import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionApplicabilityRule } from './entities/promotion-applicability-rule.entity';
import { OrderPromotion } from './entities/order-promotion.entity';
import { FlashSale } from './entities/flash-sale.entity';
import { FlashSaleProduct } from './entities/flash-sale-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, PromotionApplicabilityRule, OrderPromotion, FlashSale, FlashSaleProduct])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule { }
