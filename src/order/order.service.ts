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
import { MailService } from '../mail/mail.service';

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
    private readonly mailService: MailService,
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
      phoneNumber: dto.phoneNumber,
      type: dto.type,
    });

    const savedOrder = await this.orderRepository.save(order);

    if (dto.type === 'bank') {
      await this.mailService.sendMail({
        to: 'sultanalimzhanov2000@gmail.com',
        subject: 'Новый заказ',
        html: `
      <h2>Новый заказ</h2>
      <p><strong>Клиент:</strong> ${user.firstName} ${user.lastName}</p>
      <p><strong>Номер телефона:</strong> ${dto.phoneNumber}</p>
    `,
      });
    }

    return savedOrder;
  }

  async findAll(
    page = 1,
    size = 10,
    search?: string,
    city?: string,
    categoryId?: string,
    subcategoryId?: string,
  ): Promise<{ data: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    if (search) {
      query.andWhere(
        "LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE :search",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (city) {
      query.andWhere('LOWER(user.city) LIKE :city', {
        city: `%${city.toLowerCase()}%`,
      });
    }

    if (categoryId) {
      query.andWhere('product.category = :categoryId', { categoryId });
    }

    if (subcategoryId) {
      query.andWhere('product.subcategory = :subcategoryId', { subcategoryId });
    }

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'user',
        'items',
        'items.product',
        'items.product.category',
        'items.product.subcategory',
        'items.product.images',
      ],
    });
    if (!order) throw new NotFoundException('Заказ не найден');

    const total = order.items.reduce((sum, item) => {
      const price =
        typeof item.product.price === 'string'
          ? parseFloat(item.product.price)
          : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    return {
      ...order,
      total,
    };
  }
}
