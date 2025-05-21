import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entity/product.entity';
import { Subcategory } from '../subcategory/entity/subcategory.entity';
import { Category } from '../category/entity/category.entity';
import { FileEntity } from '../files/entity/file.entity';
import { ProductResponseDto } from './dto/product-response.dto';

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

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const subcategory = await this.subcategoryRepository.findOne({
      where: { id: subcategoryId, category: { id: categoryId } },
      relations: ['category'],
    });
    if (!subcategory) {
      throw new NotFoundException('Подкатегория не найдена');
    }

    const images = imageIds?.length
      ? await this.fileRepository.findByIds(imageIds)
      : [];

    if (imageIds && images.length !== imageIds.length) {
      throw new NotFoundException('Некоторые изображения не найдены');
    }

    const product = this.productRepository.create({
      ...otherData,
      category,
      subcategory,
      images,
    });

    return this.productRepository.save(product);
  }

  async findAll(
    page = 1,
    size = 10,
    search?: string,
    categoryId?: string,
    subcategoryId?: string,
  ): Promise<{ data: Product[]; total: number }> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.images', 'images')
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    if (search) {
      query.andWhere('LOWER(product.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
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

  async findOne(id: string): Promise<ProductResponseDto | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'subcategory', 'images'],
    });

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      subcategory: product.subcategory,
      createdAt: product.createdAt,
      imageIds: product.images ? product.images.map((img) => img.id) : [],
    };
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

    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Категория не найдена');
      }

      product.category = category;
    }

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

    Object.assign(product, otherData);

    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }
}
