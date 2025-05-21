import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../product/entity/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column()
  quantity: number;
}
