import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entity/product.entity';
import { Subcategory } from '../subcategory/entity/subcategory.entity';
import { Category } from '../category/entity/category.entity';
import { FileEntity } from '../files/entity/file.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, subcategoryId, imageIds, ...otherData } =
      createProductDto;

    // Проверка категории
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    // Проверка подкатегории
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id: subcategoryId, category: { id: categoryId } },
      relations: ['category'],
    });
    if (!subcategory) {
      throw new NotFoundException('Подкатегория не найдена');
    }

    // Получение файлов по массиву ID
    const images = imageIds?.length
      ? await this.fileRepository.findByIds(imageIds)
      : [];

    if (imageIds && images.length !== imageIds.length) {
      throw new NotFoundException('Некоторые изображения не найдены');
    }

    // Создание продукта
    const product = this.productRepository.create({
      ...otherData,
      category,
      subcategory,
      images,
    });

    return this.productRepository.save(product);
  }

  findAll(page = 1, size = 10): Promise<{ data: Product[]; total: number }> {
    return this.productRepository
      .findAndCount({
        skip: (page - 1) * size,
        take: size,
        relations: ['category', 'subcategory'],
        order: { createdAt: 'DESC' },
      })
      .then(([data, total]) => ({ data, total }));
  }

  findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['category', 'subcategory'],
    });
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product | null> {
    const { categoryId, subcategoryId, imageIds, ...otherData } =
      updateProductDto;

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'subcategory', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Продукт не найден');
    }

    // Обновление категории, если указана
    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Категория не найдена');
      }

      product.category = category;
    }

    // Обновление подкатегории, если указана
    if (subcategoryId) {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id: subcategoryId },
      });

      if (!subcategory) {
        throw new NotFoundException('Подкатегория не найдена');
      }

      product.subcategory = subcategory;
    }

    if (imageIds) {
      const images = await this.fileRepository.findByIds(imageIds);
      if (images.length !== imageIds.length) {
        throw new NotFoundException('Некоторые изображения не найдены');
      }
      product.images = images;
    }

    // Обновление других данных продукта
    Object.assign(product, otherData);

    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }
}
