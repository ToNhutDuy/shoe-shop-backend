import { z } from 'zod';

export const CreateProductCategorySchema = z.object({
    name: z.string().min(1, 'Tên danh mục sản phẩm không được để trống').max(255, 'Tên danh mục sản phẩm không được quá dài'),
    parentCategoryId: z.number().int().positive().optional().nullable(),
    coverImageMediaId: z.number().int().positive().optional().nullable(),
    description: z.string().optional().nullable(),
    displayOrder: z.number().int().min(0).default(0).optional(),
    isActive: z.boolean().default(true).optional(),
});
export type CreateProductCategoryDto = z.infer<typeof CreateProductCategorySchema>;

export const UpdateProductCategorySchema = CreateProductCategorySchema.partial();
export type UpdateProductCategoryDto = z.infer<typeof UpdateProductCategorySchema>;

export const CreateBrandSchema = z.object({
    name: z.string().min(1, 'Tên thương hiệu không được để trống').max(255, 'Tên thương hiệu quá dài'),
    logoMediaId: z.number().int().positive().optional().nullable(),
    description: z.string().optional().nullable(),
});
export type CreateBrandDto = z.infer<typeof CreateBrandSchema>;

export const UpdateBrandSchema = CreateBrandSchema.partial();
export type UpdateBrandDto = z.infer<typeof UpdateBrandSchema>;

export const CreateAttributeSchema = z.object({
    name: z.string().min(1, 'Attribute name cannot be empty').max(100, 'Attribute name is too long'),
});
export type CreateAttributeDto = z.infer<typeof CreateAttributeSchema>;

export const UpdateAttributeSchema = CreateAttributeSchema.partial();
export type UpdateAttributeDto = z.infer<typeof UpdateAttributeSchema>;

export const CreateAttributeValueSchema = z.object({
    attributeId: z.number().int().positive(),
    value: z.string().min(1, 'Attribute value cannot be empty').max(100, 'Attribute value is too long'),
    colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code').optional().nullable(),
});
export type CreateAttributeValueDto = z.infer<typeof CreateAttributeValueSchema>;

export const UpdateAttributeValueSchema = CreateAttributeValueSchema.partial();
export type UpdateAttributeValueDto = z.infer<typeof UpdateAttributeValueSchema>;


const ProductVariantBaseSchema = z.object({
    variant_sku: z.string().min(1, 'Variant SKU cannot be empty').max(100, 'Variant SKU is too long'),
    cost_price: z.number().min(0).optional().nullable(),
    selling_price: z.number().min(0),
    stock_quantity: z.number().int().min(0).default(0).optional(),
    variant_image_media_id: z.number().int().positive().optional().nullable(),
    is_active: z.boolean().default(true).optional(),
});

export const CreateProductVariantSchema = ProductVariantBaseSchema.extend({

    attributeValueIds: z.array(z.number().int().positive()).min(1, 'At least one attribute value ID is required for a variant').optional(),
});
export type CreateProductVariantDto = z.infer<typeof CreateProductVariantSchema>;

export const UpdateProductVariantSchema = ProductVariantBaseSchema.partial().extend({
    attributeValueIds: z.array(z.number().int().positive()).min(1, 'At least one attribute value ID is required for a variant').optional(),
});
export type UpdateProductVariantDto = z.infer<typeof UpdateProductVariantSchema>;

export const AddVariantAttributeValueSchema = z.object({
    attributeValueIds: z.array(z.number().int().positive()).min(1),
});
export type AddVariantAttributeValueDto = z.infer<typeof AddVariantAttributeValueSchema>;

export const CreateProductGalleryMediaSchema = z.object({
    mediaId: z.number().int().positive(),
    altText: z.string().max(255).optional().nullable(),
    displayOrder: z.number().int().min(0).default(0).optional(),
});
export type CreateProductGalleryMediaDto = z.infer<typeof CreateProductGalleryMediaSchema>;

export const UpdateProductGalleryMediaSchema = z.object({
    altText: z.string().max(255).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
});
export type UpdateProductGalleryMediaDto = z.infer<typeof UpdateProductGalleryMediaSchema>;

export const AddGalleryImagesToProductSchema = z.array(CreateProductGalleryMediaSchema);
export type AddGalleryImagesToProductDto = z.infer<typeof AddGalleryImagesToProductSchema>;

export const CreateProductSchema = z.object({
    name: z.string().min(1, 'Tên sản phẩm không được để trống').max(255, 'Tên sản phẩm quá dài'),
    shortDescription: z.string().optional().nullable(),
    longDescription: z.string().optional().nullable(),
    categoryId: z.number().int().positive(),
    brandId: z.number().int().positive().optional().nullable(),
    mainCoverImageMediaId: z.number().int().positive().optional().nullable(),
    status: z.enum(['published', 'draft', 'archived']).default('draft').optional(),
    galleryMedia: z.array(CreateProductGalleryMediaSchema).optional(),
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

export const CreateProductReviewSchema = z.object({
    productId: z.number().int().positive(),
    userId: z.number().int().positive(),
    orderId: z.number().int().positive().optional().nullable(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional().nullable(),
    status: z.enum(['pending', 'approved', 'rejected']).default('pending').optional(),
    reviewedAt: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()).optional(),
});
export type CreateProductReviewDto = z.infer<typeof CreateProductReviewSchema>;

export const UpdateProductReviewSchema = CreateProductReviewSchema.partial();
export type UpdateProductReviewDto = z.infer<typeof UpdateProductReviewSchema>;