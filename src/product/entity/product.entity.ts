import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Subcategory } from '../../subcategory/entity/subcategory.entity';
import { Category } from '../../category/entity/category.entity';
import { FileEntity } from '../../files/entity/file.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @OneToMany(() => FileEntity, (file) => file.product, { cascade: true })
  @JoinTable()
  images: FileEntity[];

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'CASCADE',
  })
  category: Category;

  @ManyToOne(() => Subcategory, (subcategory) => subcategory.products, {
    onDelete: 'CASCADE',
  })
  subcategory: Subcategory;

  @CreateDateColumn()
  createdAt: Date;
}
