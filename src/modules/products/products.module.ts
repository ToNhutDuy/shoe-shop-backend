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
import { BrandsService } from './services/brands.service';
import { ReviewsService } from './services/reviews.service';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductsController } from './controllers/products.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { BrandsController } from './controllers/brands.controller';
import { ProductCategoriesController } from './controllers/product-categories.controller';



@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductVariantAttributeValue, ProductReview, ProductGalleryMedia, ProductCategory, Brand, Attribute, AttributeValue])],
  controllers: [ProductsController, ReviewsController, BrandsController, ProductCategoriesController],
  providers: [ProductsService, BrandsService, ReviewsService, ProductCategoriesService],
})
export class ProductsModule { }
