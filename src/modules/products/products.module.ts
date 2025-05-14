import { Module } from '@nestjs/common';
import { ProductCategoryService } from './services/product-category.service';
import { AttributeService } from './services/attribute.service';
import { AttributeValueService } from './services/attribute-value.service';
import { BrandService } from './services/brand.service';
import { ProductGalleryMediaService } from './services/product-gallery-media.service';
import { ProductReviewService } from './services/product-review.service';
import { ProductVariantAttributeValueService } from './services/product-variant-attribute-value.service';
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
import { ProductService } from './services/product.service';


@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductVariantAttributeValue, ProductReview, ProductGalleryMedia, ProductCategory, Brand, Attribute, AttributeValue])],
  controllers: [],
  providers: [ProductService, ProductCategoryService, AttributeService, AttributeValueService, BrandService, ProductGalleryMediaService, ProductReviewService, ProductVariantAttributeValueService],
})
export class ProductsModule { }
