import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryService } from '../category/category.service';
import { Subcategory } from './entity/subcategory.entity';

@Injectable()
export class SubcategoryService {
  constructor(
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(title: string, categoryId: string): Promise<Subcategory> {
    const category = await this.categoryService.findOne(categoryId);
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const subcategory = this.subcategoryRepository.create({
      title,
      category,
    });

    return this.subcategoryRepository.save(subcategory);
  }

  async findAll(): Promise<Subcategory[]> {
    return this.subcategoryRepository.find({ relations: ['category'] });
  }

  async findOne(id: string): Promise<Subcategory | null> {
    return this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.subcategoryRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Подкатегория не найдена');
    }
  }
}
