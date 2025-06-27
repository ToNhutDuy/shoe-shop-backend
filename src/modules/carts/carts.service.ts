import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, FindOperator } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CartItemDto } from './schemas/cart-item.schema';
import { WishlistItemDto } from './schemas/wishlist-item.schema';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        @InjectRepository(CartItem)
        private cartItemRepository: Repository<CartItem>,
        @InjectRepository(WishlistItem)
        private wishlistItemRepository: Repository<WishlistItem>,
        @InjectRepository(ProductVariant)
        private productVariantRepository: Repository<ProductVariant>,
    ) { }


    private async findCartItem(userId: number | null, sessionId: string | null, productVariantId: number): Promise<CartItem | null> {

        if (userId) {
            return this.cartItemRepository.findOne({
                where: { user_id: userId, product_variant_id: productVariantId },
                relations: ['productVariant']
            });
        } else if (sessionId) {
            return this.cartItemRepository.findOne({
                where: { session_id: sessionId, product_variant_id: productVariantId },
                relations: ['productVariant']
            });
        }
        return null;
    }


    async addOrUpdateCartItem(
        createCartItemDto: CartItemDto,
        userId: number | null,
        sessionId: string | null,
    ): Promise<CartItem> {
        const { product_variant_id, quantity } = createCartItemDto;

        if (!userId && !sessionId) {
            throw new BadRequestException('User ID or Session ID must be provided to add to cart.');
        }

        const productVariant = await this.productVariantRepository.findOne({
            where: { id: product_variant_id, is_active: true },
        });

        if (!productVariant) {
            throw new NotFoundException(`Product variant with ID ${product_variant_id} not found or is inactive.`);
        }

        if (productVariant.stock_quantity < quantity) {
            throw new BadRequestException(`Not enough stock for product variant ${product_variant_id}. Available: ${productVariant.stock_quantity}`);
        }

        try {
            let cartItem: CartItem | null = null;
            if (userId) {
                cartItem = await this.cartItemRepository.findOne({
                    where: { user_id: userId, product_variant_id: product_variant_id }
                });
            } else if (sessionId) {
                cartItem = await this.cartItemRepository.findOne({
                    where: { session_id: sessionId, product_variant_id: product_variant_id }
                });
            }

            if (cartItem) {

                cartItem.quantity += quantity;
                if (productVariant.stock_quantity < cartItem.quantity) {
                    throw new BadRequestException(`Adding ${quantity} units would exceed available stock (${productVariant.stock_quantity}). Current cart quantity: ${cartItem.quantity - quantity}`);
                }
                await this.cartItemRepository.save(cartItem);
                this.logger.log(`Updated cart item ID ${cartItem.id} for ${userId ? `user ${userId}` : `session ${sessionId}`}. New quantity: ${cartItem.quantity}`);
            } else {

                cartItem = this.cartItemRepository.create({
                    user_id: userId,
                    session_id: sessionId,
                    product_variant_id,
                    quantity,
                });
                await this.cartItemRepository.save(cartItem);
                this.logger.log(`Added new cart item ID ${cartItem.id} for ${userId ? `user ${userId}` : `session ${sessionId}`}.`);
            }
            return cartItem;
        } catch (error) {
            this.logger.error(`Failed to add/update cart item: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not add or update item in cart.');
        }
    }


    async getCartItems(userId: number | null, sessionId: string | null): Promise<CartItem[]> {
        if (!userId && !sessionId) {
            return [];
        }

        const queryOptions: any = {
            relations: ['productVariant', 'productVariant.product'],
            order: { created_at: 'ASC' as const },
        };

        try {
            if (userId) {
                return this.cartItemRepository.find({
                    where: { user_id: userId },
                    ...queryOptions
                });
            } else {
                return this.cartItemRepository.find({
                    where: { session_id: sessionId as string },
                    ...queryOptions
                });
            }
        } catch (error) {
            this.logger.error(`Failed to retrieve cart items: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not retrieve cart items.');
        }
    }


    async updateCartItemQuantity(
        cartItemId: number,
        updateCartItemDto: CartItemDto,
        userId: number | null,
        sessionId: string | null,
    ): Promise<CartItem> {
        const { quantity } = updateCartItemDto;

        let cartItem: CartItem | null;
        if (userId) {
            cartItem = await this.cartItemRepository.findOne({
                where: { id: cartItemId, user_id: userId },
                relations: ['productVariant']
            });
        } else if (sessionId) {
            cartItem = await this.cartItemRepository.findOne({
                where: { id: cartItemId, session_id: sessionId },
                relations: ['productVariant']
            });
        } else {
            throw new BadRequestException('User ID or Session ID must be provided.');
        }

        if (!cartItem) {
            throw new NotFoundException(`Cart item with ID ${cartItemId} not found or does not belong to the provided user/session.`);
        }

        if (cartItem.productVariant.stock_quantity < quantity) {
            throw new BadRequestException(`Not enough stock for this item. Available: ${cartItem.productVariant.stock_quantity}`);
        }

        cartItem.quantity = quantity;
        try {
            return await this.cartItemRepository.save(cartItem);
        } catch (error) {
            this.logger.error(`Failed to update cart item quantity: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not update cart item quantity.');
        }
    }


    async removeCartItem(cartItemId: number, userId: number | null, sessionId: string | null): Promise<void> {
        let result: any;
        if (userId) {
            result = await this.cartItemRepository.delete({ id: cartItemId, user_id: userId });
        } else if (sessionId) {
            result = await this.cartItemRepository.delete({ id: cartItemId, session_id: sessionId });
        } else {
            throw new BadRequestException('User ID or Session ID must be provided.');
        }

        if (result.affected === 0) {
            throw new NotFoundException(`Cart item with ID ${cartItemId} not found or does not belong to the provided user/session.`);
        }
        this.logger.log(`Removed cart item ID ${cartItemId}.`);
    }


    async clearCart(userId: number | null, sessionId: string | null): Promise<void> {
        let result: any;
        if (userId) {
            result = await this.cartItemRepository.delete({ user_id: userId });
        } else if (sessionId) {
            result = await this.cartItemRepository.delete({ session_id: sessionId });
        } else {
            throw new BadRequestException('User ID or Session ID must be provided.');
        }
        if (result.affected > 0) {
            this.logger.log(`Cleared cart for ${userId ? `user ${userId}` : `session ${sessionId}`}.`);
        }
    }


    async mergeGuestCart(userId: number, sessionId: string): Promise<void> {
        const guestCartItems = await this.cartItemRepository.find({ where: { session_id: sessionId } });

        if (guestCartItems.length === 0) {
            return;
        }

        for (const guestItem of guestCartItems) {
            let userCartItem = await this.cartItemRepository.findOne({
                where: { user_id: userId, product_variant_id: guestItem.product_variant_id },
                relations: ['productVariant']
            });

            if (userCartItem) {
                const newQuantity = userCartItem.quantity + guestItem.quantity;
                if (userCartItem.productVariant.stock_quantity < newQuantity) {
                    this.logger.warn(`Merging would exceed stock for product variant ${guestItem.product_variant_id}. Setting quantity to max available.`);
                    userCartItem.quantity = userCartItem.productVariant.stock_quantity;
                } else {
                    userCartItem.quantity = newQuantity;
                }
                await this.cartItemRepository.save(userCartItem);
            } else {

                guestItem.user_id = userId;
                guestItem.session_id = null;
                await this.cartItemRepository.save(guestItem);
            }
        }
        await this.cartItemRepository.delete({ session_id: sessionId });
        this.logger.log(`Merged guest cart from session ${sessionId} to user ${userId}.`);
    }


    async addWishlistItem(userId: number, createWishlistItemDto: WishlistItemDto): Promise<WishlistItem> {
        const { product_variant_id } = createWishlistItemDto;

        const productVariant = await this.productVariantRepository.findOne({
            where: { id: product_variant_id, is_active: true },
        });

        if (!productVariant) {
            throw new NotFoundException(`Product variant with ID ${product_variant_id} not found or is inactive.`);
        }

        const existingItem = await this.wishlistItemRepository.findOne({
            where: { user_id: userId, product_variant_id },
        });

        if (existingItem) {
            throw new BadRequestException('This product variant is already in your wishlist.');
        }

        try {
            const wishlistItem = this.wishlistItemRepository.create({
                user_id: userId,
                product_variant_id,
            });
            await this.wishlistItemRepository.save(wishlistItem);
            this.logger.log(`Added product variant ${product_variant_id} to wishlist for user ${userId}. Wishlist item ID: ${wishlistItem.id}`);
            return wishlistItem;
        } catch (error) {
            this.logger.error(`Failed to add wishlist item: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not add item to wishlist.');
        }
    }

    async getWishlistItems(userId: number): Promise<WishlistItem[]> {
        try {
            return this.wishlistItemRepository.find({
                where: { user_id: userId },
                relations: ['productVariant', 'productVariant.product'],
                order: { added_at: 'ASC' as const },
            });
        } catch (error) {
            this.logger.error(`Failed to retrieve wishlist items: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Could not retrieve wishlist items.');
        }
    }

    async removeWishlistItem(userId: number, wishlistItemId: number): Promise<void> {
        const result = await this.wishlistItemRepository.delete({ id: wishlistItemId, user_id: userId });

        if (result.affected === 0) {
            throw new NotFoundException(`Wishlist item with ID ${wishlistItemId} not found or does not belong to user ${userId}.`);
        }
        this.logger.log(`Removed wishlist item ID ${wishlistItemId} for user ${userId}.`);
    }

    async moveWishlistItemToCart(userId: number, wishlistItemId: number): Promise<CartItem> {
        const wishlistItem = await this.wishlistItemRepository.findOne({
            where: { id: wishlistItemId, user_id: userId },
            relations: ['productVariant']
        });

        if (!wishlistItem) {
            throw new NotFoundException(`Wishlist item with ID ${wishlistItemId} not found or does not belong to user ${userId}.`);
        }

        const { product_variant_id, productVariant } = wishlistItem;

        if (productVariant.stock_quantity === 0) {
            throw new BadRequestException('Product variant is out of stock.');
        }


        const cartItem = await this.addOrUpdateCartItem(
            { product_variant_id: product_variant_id, quantity: 1 },
            userId,
            null
        );


        await this.removeWishlistItem(userId, wishlistItemId);

        this.logger.log(`Moved wishlist item ID ${wishlistItemId} to cart for user ${userId}.`);
        return cartItem;
    }
}