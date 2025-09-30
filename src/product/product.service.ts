import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import slugify from 'slugify';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entity/product.entity';
import { Subcategory } from '../subcategory/entity/subcategory.entity';
import { Category } from '../category/entity/category.entity';
import { FileEntity } from '../files/entity/file.entity';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// ─── helper: берём только разрешённые поля и отбрасываем пустые строки ──────
function pickDefinedNonEmpty<T extends object>(
  src: Partial<T>,
  keys: (keyof T)[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    (out as any)[k] = v;
  }
  return out;
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Subcategory)
    private readonly subcategoryRepo: Repository<Subcategory>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
  ) {}

  // ─── slug & SEO helpers ──────────────────────────────────────────────────
  private async makeUniqueSlug(base: string): Promise<string> {
    let s = slugify(base ?? '', { lower: true, strict: true, trim: true });
    if (!s) s = 'product';
    let candidate = s;
    let i = 1;
    while (await this.productRepo.exists({ where: { slug: candidate } })) {
      candidate = `${s}-${i++}`;
    }
    return candidate;
  }

  private clamp(str: string, max: number): string {
    return !str
      ? ''
      : str.length <= max
        ? str
        : str.slice(0, max - 1).trimEnd() + '…';
  }

  private buildAutoDescription(
    name: string,
    cat?: Category,
    sub?: Subcategory,
  ) {
    const parts = [name];
    if ((sub as any)?.name) parts.push(String((sub as any).name));
    if ((cat as any)?.name) parts.push(String((cat as any).name));
    return this.clamp(`${parts.join(' — ')}. Товар в наличии.`, 400);
  }

  private buildMetaTitle(name: string, brand = 'Магазин Автозапчастей') {
    return this.clamp(`${name} — ${brand}`, 70);
  }

  private buildMetaDescription(name: string, price?: number, currency = '₸') {
    const priceText =
      typeof price === 'number' ? ` по цене ${price} ${currency}` : '';
    return this.clamp(
      `${name}${priceText}. Быстрая доставка, актуальные цены.`,
      160,
    );
  }

  private ensureSeoFields(p: Product) {
    if (!p.description?.trim())
      p.description = this.buildAutoDescription(
        p.name,
        p.category,
        p.subcategory,
      );
    if (!p.metaTitle?.trim()) p.metaTitle = this.buildMetaTitle(p.name);
    if (!p.metaDescription?.trim())
      p.metaDescription = this.buildMetaDescription(p.name, Number(p.price));
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto): Promise<Product> {
    const { categoryId, subcategoryId, imageIds, ...rest } = dto;

    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');

    const subcategory = await this.subcategoryRepo.findOne({
      where: { id: subcategoryId, category: { id: categoryId } },
      relations: ['category'],
    });
    if (!subcategory) throw new NotFoundException('Подкатегория не найдена');

    const images = imageIds?.length
      ? await this.fileRepo.findBy({ id: In(imageIds) })
      : [];
    if (imageIds && images.length !== imageIds.length) {
      throw new NotFoundException('Некоторые изображения не найдены');
    }

    const slug = await this.makeUniqueSlug(rest.name);

    const allowed: (keyof Product)[] = [
      'name',
      'price',
      'quantity',
      'code',
      'description',
      'metaTitle',
      'metaDescription',
      'isPublished',
    ];
    const safe = pickDefinedNonEmpty<Product>(rest as any, allowed);

    const product: Product = this.productRepo.create({
      ...safe,
      slug,
      category,
      subcategory,
      images,
      isPublished: safe.isPublished ?? true,
    });

    this.ensureSeoFields(product);
    return this.productRepo.save(product);
  }

  async findAll(
    page = 1,
    size = 10,
    search?: string,
    categoryId?: string,
    subcategoryId?: string,
    isAdmin = false,
  ): Promise<{ data: Product[]; total: number }> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.images', 'images')
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    if (!isAdmin) {
      qb.andWhere('product.isPublished = :pub', { pub: true }).andWhere(
        'product.quantity > 0',
      );
    }
    if (search) {
      qb.andWhere(
        '(LOWER(product.name) LIKE :s OR LOWER(product.code) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }
    if (categoryId) qb.andWhere('category.id = :categoryId', { categoryId });
    if (subcategoryId)
      qb.andWhere('subcategory.id = :subcategoryId', { subcategoryId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findBySlug(slug: string): Promise<ProductResponseDto | null> {
    const p = await this.productRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['category', 'subcategory', 'images'],
    });
    return p ? this.mapToResponse(p) : null;
  }

  async findOne(id: string): Promise<ProductResponseDto | null> {
    const p = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'subcategory', 'images'],
    });
    return p ? this.mapToResponse(p) : null;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const { categoryId, subcategoryId, imageIds, ...rest } = dto;

    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'subcategory', 'images'],
    });
    if (!product) throw new NotFoundException('Продукт не найден');

    if (categoryId) {
      const c = await this.categoryRepo.findOne({ where: { id: categoryId } });
      if (!c) throw new NotFoundException('Категория не найдена');
      product.category = c;
    }
    if (subcategoryId) {
      const s = await this.subcategoryRepo.findOne({
        where: { id: subcategoryId },
      });
      if (!s) throw new NotFoundException('Подкатегория не найдена');
      product.subcategory = s;
    }
    if (imageIds) {
      const imgs = await this.fileRepo.findBy({ id: In(imageIds) });
      if (imgs.length !== imageIds.length)
        throw new NotFoundException('Некоторые изображения не найдены');
      product.images = imgs;
    }

    const allowed: (keyof Product)[] = [
      'name',
      'price',
      'quantity',
      'code',
      'description',
      'metaTitle',
      'metaDescription',
      'isPublished',
    ];
    const safe = pickDefinedNonEmpty<Product>(rest as any, allowed);
    const nameChanged =
      typeof safe.name === 'string' && safe.name !== product.name;

    Object.assign(product, safe);
    if (nameChanged) product.slug = await this.makeUniqueSlug(product.name);

    this.ensureSeoFields(product);
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    await this.productRepo.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.productRepo.restore(id);
  }

  async purge(id: string): Promise<void> {
    await this.productRepo.delete(id);
  }

  // ─── админские утилиты для уже существующих товаров ──────────────────────
  async backfillSlugsFromExistingNames() {
    const rows = await this.productRepo.find({
      where: [{ slug: null as any }, { slug: '' as any }],
      select: ['id', 'name', 'slug'],
    });
    for (const r of rows) {
      const base = r.name?.trim() ? r.name : `Товар ${r.id.slice(0, 8)}`;
      await this.productRepo.update(r.id, {
        slug: await this.makeUniqueSlug(base),
      });
    }
    return { updated: rows.length };
  }

  async backfillSlugsAndSeo() {
    const rows = await this.productRepo.find({
      relations: ['category', 'subcategory', 'images'],
    });
    for (const p of rows) {
      let changed = false;
      if (!p.slug?.trim()) {
        p.slug = await this.makeUniqueSlug(p.name);
        changed = true;
      }
      const old = { t: p.metaTitle, d: p.metaDescription, c: p.description };
      this.ensureSeoFields(p);
      if (
        old.t !== p.metaTitle ||
        old.d !== p.metaDescription ||
        old.c !== p.description
      ) {
        changed = true;
      }
      if (changed) await this.productRepo.save(p);
    }
    return { updated: true, count: rows.length };
  }

  // ─── mapper DTO ───────────────────────────────────────────────────────────
  private mapToResponse(p: Product): ProductResponseDto {
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      price: p.price,
      quantity: p.quantity,
      category: p.category,
      subcategory: p.subcategory,
      createdAt: p.createdAt,
      imageIds: p.images?.map((img) => img.id) ?? [],
      slug: p.slug,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      isPublished: p.isPublished,
    };
  }
}
