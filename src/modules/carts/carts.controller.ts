import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpStatus, HttpCode, Req, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './carts.service';
import { CartItemDto } from './schemas/cart-item.schema';
import { CartItem } from './entities/cart-item.entity';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from '../roles/enums/resource.enum';
import { Action } from '../roles/enums/action.enum';
import { WishlistItemDto } from './schemas/wishlist-item.schema';
import { WishlistItem } from './entities/wishlist-item.entity';



interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
}


interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
@Controller('cart')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CartController {
  constructor(private readonly cartService: CartService) { }


  @Post()
  @HttpCode(HttpStatus.CREATED)

  async addOrUpdateCartItem(
    @Body() cartItemDto: CartItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CartItem> {
    const userId = req.user ? req.user.userId : null;


    const sessionId: string | null = (req.headers['x-session-id'] as string) || null;

    if (!userId && !sessionId) {
      throw new BadRequestException('Session ID is required for guest cart operations.');
    }

    return this.cartService.addOrUpdateCartItem(cartItemDto, userId, sessionId);
  }

  @Get()
  async getCartItems(
    @Req() req: AuthenticatedRequest,
  ): Promise<CartItem[]> {
    const userId = req.user ? req.user.userId : null;

    const sessionId = req.headers['x-session-id'] as string || null;

    return this.cartService.getCartItems(userId, sessionId);
  }

  @Patch(':id')
  async updateCartItemQuantity(
    @Param('id') id: number,
    @Body() cartItemDto: CartItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CartItem> {
    const userId = req.user ? req.user.userId : null;
    const sessionId: string | null = (req.headers['x-session-id'] as string) || null;

    return this.cartService.updateCartItemQuantity(+id, cartItemDto, userId, sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCartItem(
    @Param('id') id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user ? req.user.userId : null;
    const sessionId: string | null = (req.headers['x-session-id'] as string) || null;

    await this.cartService.removeCartItem(+id, userId, sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user ? req.user.userId : null;
    const sessionId: string | null = (req.headers['x-session-id'] as string) || null;
    await this.cartService.clearCart(userId, sessionId);
  }


  @Post('merge-guest-cart')
  @Permissions([{ resource: Resource.users, action: [Action.update] }])
  async mergeGuestCart(
    @Req() req: AuthenticatedRequest,
    @Body('sessionId') sessionId: string,
  ): Promise<void> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to merge guest cart.');
    }
    if (!sessionId) {
      throw new BadRequestException('Guest session ID is required for merging.');
    }
    await this.cartService.mergeGuestCart(req.user.userId, sessionId);
  }


  @Post('wishlist')
  @HttpCode(HttpStatus.CREATED)
  @Permissions([{ resource: Resource.products, action: [Action.read] }])
  async addWishlistItem(
    @Body() wishlistItemDto: WishlistItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<WishlistItem> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to manage wishlist.');
    }
    return this.cartService.addWishlistItem(req.user.userId, wishlistItemDto);
  }

  @Get('wishlist')
  @Permissions([{ resource: Resource.products, action: [Action.read] }])
  async getWishlistItems(
    @Req() req: AuthenticatedRequest,
  ): Promise<WishlistItem[]> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to view wishlist.');
    }
    return this.cartService.getWishlistItems(req.user.userId);
  }

  @Delete('wishlist/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([{ resource: Resource.products, action: [Action.read] }])
  async removeWishlistItem(
    @Param('id') id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to manage wishlist.');
    }
    await this.cartService.removeWishlistItem(req.user.userId, +id);
  }

  @Post('wishlist/:id/move-to-cart')
  @HttpCode(HttpStatus.CREATED)
  @Permissions([{ resource: Resource.products, action: [Action.read] }])
  async moveWishlistItemToCart(
    @Param('id') id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<CartItem> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to perform this action.');
    }
    return this.cartService.moveWishlistItemToCart(req.user.userId, +id);
  }
}