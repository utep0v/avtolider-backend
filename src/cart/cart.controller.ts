import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  add(@Req() req, @Body() body: { productId: string; quantity: number }) {
    return this.cartService.addItem(req.user.sub, body.productId, body.quantity);
  }

  @Get()
  get(@Req() req) {
    return this.cartService.getCart(req.user.sub);
  }

  @Post(':id/decrement')
  async decrement(@Param('id') productId: string, @Req() req) {
    return this.cartService.decrementItem(req.user.sub, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyCart(@Req() req) {
    return this.cartService.getCartItems(req.user.sub);
  }

  @Patch('update')
  update(@Req() req, @Body() body: { productId: string; quantity: number }) {
    return this.cartService.updateItem(req.user.sub, body.productId, body.quantity);
  }

  @Delete('remove/:productId')
  remove(@Req() req, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.sub, productId);
  }

  @Delete('clear')
  clear(@Req() req) {
    return this.cartService.clearCart(req.user.sub);
  }
}
