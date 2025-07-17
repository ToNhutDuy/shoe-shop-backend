import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, HttpStatus, HttpCode, Req, BadRequestException, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CartService } from './carts.service';
import { CartItemDto } from './schemas/cart-item.schema';
import { CartItem } from './entities/cart-item.entity';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from '../roles/enums/resource.enum';
import { Action } from '../roles/enums/action.enum';
import { WishlistItemDto } from './schemas/wishlist-item.schema';
import { WishlistItem } from './entities/wishlist-item.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';


interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user ? request.user.userId : null;
    const sessionId: string | null = (request.headers['x-session-id'] as string) || null;
    return { userId, sessionId };
  },
);


@Controller('cart')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addOrUpdateCartItem(
    @Body() cartItemDto: CartItemDto,
    @UserSession() { userId, sessionId }: { userId: number | null; sessionId: string | null },
  ): Promise<CartItem> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Session ID is required for guest cart operations if user is not logged in.');
    }

    return this.cartService.addOrUpdateCartItem(cartItemDto, userId, sessionId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCartItems(
    @UserSession() { userId, sessionId }: { userId: number | null; sessionId: string | null },
  ): Promise<CartItem[]> {
    if (!userId && !sessionId) {
      return [];
    }
    return this.cartService.getCartItems(userId, sessionId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateCartItemQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Body() cartItemDto: CartItemDto,
    @UserSession() { userId, sessionId }: { userId: number | null; sessionId: string | null },
  ): Promise<CartItem> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Authentication or session ID is required to update cart.');
    }
    return this.cartService.updateCartItemQuantity(id, cartItemDto, userId, sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCartItem(
    @Param('id', ParseIntPipe) id: number,
    @UserSession() { userId, sessionId }: { userId: number | null; sessionId: string | null },
  ): Promise<void> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Authentication or session ID is required to remove item from cart.');
    }
    await this.cartService.removeCartItem(id, userId, sessionId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(
    @UserSession() { userId, sessionId }: { userId: number | null; sessionId: string | null },
  ): Promise<void> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Authentication or session ID is required to clear cart.');
    }
    await this.cartService.clearCart(userId, sessionId);
  }


  @Post('merge-guest-cart')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions([{ resource: Resource.products, action: [Action.create] }])
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions([{ resource: Resource.products, action: [Action.delete] }])
  async removeWishlistItem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to manage wishlist.');
    }
    await this.cartService.removeWishlistItem(req.user.userId, id);
  }

  @Post('wishlist/:id/move-to-cart')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions([{ resource: Resource.products, action: [Action.update] }, { resource: Resource.products, action: [Action.create] }])
  async moveWishlistItemToCart(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<CartItem> {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('User must be logged in to perform this action.');
    }

    return this.cartService.moveWishlistItemToCart(req.user.userId, id);
  }
}
