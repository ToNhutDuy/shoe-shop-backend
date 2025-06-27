import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Brand } from './entities/brand.entity';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { ProductReview } from './entities/product-review.entity';
import { ProductGalleryMedia } from './entities/product-gallery-media.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantAttributeValue } from './entities/product-variant-attribute-value.entity';
import { Media } from '../media/entities/media.entity';
import { ProductService } from './services/product.service';
import { ProductCategoryService } from './services/product-category.service';
import { BrandService } from './services/brand.service';
import { AttributeService } from './services/attribute.service';
import { ProductGalleryMediaService } from './services/product-gallery-media.service';
import { ProductVariantService } from './services/product-variant.service';
import { MediaService } from '../media/media.service';
import { ProductCategoryController } from './controllers/product-category.controller';
import { BrandController } from './controllers/brand.controller';
import { AttributeController } from './controllers/attribute.controller';
import { AttributeValueController } from './controllers/attribute-value.controller';
import { ProductVariantController } from './controllers/product-variant.controller';
import { ProductReviewController } from './controllers/product-review.controller';
import { ProductGalleryMediaController } from './controllers/product-gallery-media.controller';
import { ProductController } from './controllers/products.controller';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductCategory,
      Brand,
      Attribute,
      AttributeValue,
      ProductReview,
      ProductGalleryMedia,
      ProductVariant,
      ProductVariantAttributeValue,
    ]),
    UsersModule, MediaModule
  ],
  controllers: [
    ProductController,
    ProductCategoryController,
    BrandController,
    AttributeController,
    AttributeValueController,
    ProductVariantController,
    ProductReviewController,
    ProductGalleryMediaController,
  ],
  providers: [
    ProductService,
    ProductCategoryService,
    BrandService,
    AttributeService,
    ProductGalleryMediaService,
    ProductVariantService,
    MediaService,
  ],
  exports: [
    ProductService,
    ProductCategoryService,
    BrandService,
    AttributeService,
    ProductGalleryMediaService,
    ProductVariantService,
    MediaService,
    TypeOrmModule
  ],
})
export class ProductModule { }