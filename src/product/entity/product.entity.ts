import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinTable,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Subcategory } from '../../subcategory/entity/subcategory.entity';
import { Category } from '../../category/entity/category.entity';
import { FileEntity } from '../../files/entity/file.entity';

@Entity('products')
@Index('UQ_products_slug_active', ['slug'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Index()
  @Column({ nullable: true })
  slug: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  code: string;

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

  @Column({ default: true })
  isPublished: boolean;

  @Column({ nullable: true })
  metaTitle: string;

  @Column({ nullable: true })
  metaDescription: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
