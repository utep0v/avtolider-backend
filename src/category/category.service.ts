import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entity/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FilesService } from '../files/files.service';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly filesService: FilesService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category | null> {
    const category = await this.findOne(id);

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (updateCategoryDto.photoId) {
      category.photoId = updateCategoryDto.photoId;
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ relations: ['subcategories'] });
  }

  async findOne(id: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (category.photoId) {
      await this.filesService.deleteFile(category.photoId);
    }

    await this.categoryRepository.remove(category);
  }
}
