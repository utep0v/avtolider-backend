import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ValidationPipe,
  UsePipes,
  Res,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateProductDto } from './dto/update-product.dto';
import { Response } from 'express'; // ⬅️ вот это важно

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('size') size = 10,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('isAdmin') isAdmin?: string,
  ) {
    return this.productService.findAll(
      +page,
      +size,
      search,
      categoryId,
      subcategoryId,
      isAdmin === 'true',
    );
  }

  // публичная карточка по slug
  @Get('slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    const p = await this.productService.findBySlug(slug);
    if (!p) throw new NotFoundException();
    return p;
  }

  // SEO payload для SSR/SSG
  @Get('slug/:slug/seo')
  async seo(@Param('slug') slug: string) {
    const p = await this.productService.findBySlug(slug);
    if (!p) throw new NotFoundException();

    const publicUrl = process.env.APP_PUBLIC_URL ?? 'https://example.com';
    const images = (p.imageIds || []).map((id) => `${publicUrl}/files/${id}`);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: images,
      description: (p as any).metaDescription || (p as any).description || '',
      sku: p.code,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KZT',
        price: String(p.price),
        availability:
          p.quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `${publicUrl}/products/${(p as any).slug}`,
      },
    };

    return {
      title: (p as any).metaTitle || p.name,
      description: (p as any).metaDescription || (p as any).description || '',
      canonical: `${publicUrl}/products/${(p as any).slug}`,
      jsonLd,
    };
  }

  // одноразовая генерация slug из существующих name (name не трогаем)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/backfill-slugs')
  backfillSlugs() {
    return this.productService.backfillSlugsFromExistingNames();
  }

  // slug + SEO (если нужно добить SEO полями)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/backfill-slugs-seo')
  backfill() {
    return this.productService.backfillSlugsAndSeo();
  }

  // админ/внутреннее API по id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.productService.restore(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/purge')
  purge(@Param('id') id: string) {
    return this.productService.purge(id);
  }

  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const { data } = await this.productService.findAll(
      1,
      10000,
      undefined,
      undefined,
      undefined,
      true,
    );

    const publicUrl = process.env.APP_PUBLIC_URL ?? 'https://example.com';

    const urls = data.map(
      (p) => `
      <url>
        <loc>${publicUrl}/products/${p.slug}</loc>
        <lastmod>${p.createdAt.toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>
    `,
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join('\n')}
    </urlset>
  `;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  }
}
