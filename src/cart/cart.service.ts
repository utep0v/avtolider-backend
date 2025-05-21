import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entity/cart.entity';
import { CartItem } from './entity/cart-item.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../user/entity/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getUserCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });
    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('Пользователь не найден');
      cart = this.cartRepo.create({ user, items: [] });
      await this.cartRepo.save(cart);
    }
    return cart;
  }

  async getCartItems(userId: string) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.images'],
    });
    if (!cart) return { items: [], total: 0 };

    const items = cart.items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
      images: item.product.images?.map((img) => ({
        id: img.id,
        url: `/files/${img.id}`,
      })),
    }));

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return { items, total };
  }

  async addItem(userId: string, productId: string, quantity: number = 1) {
    const cart = await this.getUserCart(userId);
    let item = cart.items.find((i) => i.product.id === productId);
    if (item) {
      item.quantity += quantity;
    } else {
      const product = await this.productRepo.findOne({
        where: { id: productId },
      });
      if (!product) throw new NotFoundException('Товар не найден');
      item = this.itemRepo.create({ cart, product, quantity });
      cart.items.push(item);
    }
    await this.cartRepo.save(cart);
    return cart;
  }

  async decrementItem(userId: string, productId: string) {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });
    if (!cart) throw new NotFoundException('Корзина не найдена');

    const item = cart.items.find((i) => i.product.id === productId);
    if (!item) throw new NotFoundException('Товар не найден в корзине');

    if (item.quantity > 1) {
      item.quantity -= 1;
      await this.itemRepo.save(item);
    } else {
      await this.itemRepo.remove(item);
      cart.items = cart.items.filter((i) => i.product.id !== productId);
    }

    await this.cartRepo.save(cart);

    return {
      productId,
      count: cart.items.find((i) => i.product.id === productId)?.quantity || 0,
      items: cart.items.map((i) => ({
        productId: i.product.id,
        count: i.quantity,
      })),
    };
  }

  async getCart(userId: string) {
    return this.getUserCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await this.getUserCart(userId);
    const item = cart.items.find((i) => i.product.id === productId);
    if (!item) throw new NotFoundException('Товар не найден в корзине');
    item.quantity = quantity;
    await this.cartRepo.save(cart);
    return cart;
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getUserCart(userId);
    cart.items = cart.items.filter((i) => i.product.id !== productId);
    await this.cartRepo.save(cart);
    return cart;
  }

  async clearCart(userId: string) {
    const cart = await this.getUserCart(userId);
    cart.items = [];
    await this.cartRepo.save(cart);
    return cart;
  }
}
