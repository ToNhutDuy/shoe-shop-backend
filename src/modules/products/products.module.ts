import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantAttributeValue } from './entities/product-variant-attribute-value.entity';
import { ProductReview } from './entities/product-review.entity';
import { ProductGalleryMedia } from './entities/product-gallery-media.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Brand } from './entities/brand.entity';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { ProductsService } from './services/products.service';

import { ProductsController } from './controllers/products.controller';




@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductVariantAttributeValue, ProductReview, ProductGalleryMedia, ProductCategory, Brand, Attribute, AttributeValue])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule { }
