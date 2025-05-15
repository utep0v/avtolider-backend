import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entity/product.entity';
import { Subcategory } from '../subcategory/entity/subcategory.entity';
import { Category } from '../category/entity/category.entity';
import { FileEntity } from '../files/entity/file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Subcategory, Category, FileEntity]),
  ],
  providers: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
