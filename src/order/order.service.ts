import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entity/order.entity';
import { OrderItem } from './entity/order-item.entity';
import { Product } from '../product/entity/product.entity';
import { User } from '../user/entity/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const items: OrderItem[] = [];
    for (const item of dto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      if (!product)
        throw new NotFoundException(`Товар не найден: ${item.productId}`);
      if (product.quantity < item.quantity) {
        throw new BadRequestException(`Недостаточно товара: ${product.name}`);
      }
      product.quantity -= item.quantity;
      await this.productRepository.save(product);

      const orderItem = this.orderItemRepository.create({
        product,
        quantity: item.quantity,
      });
      items.push(orderItem);
    }

    const order = this.orderRepository.create({
      user,
      items,
    });

    return this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['user', 'items', 'items.product'],
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }
}
