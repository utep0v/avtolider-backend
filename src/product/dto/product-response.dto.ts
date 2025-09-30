export class ProductResponseDto {
  id: string;
  name: string;
  code: string;
  slug: string;
  price: number;
  quantity: number;
  category: any;
  metaTitle: any;
  metaDescription: any;
  isPublished: any;
  subcategory: any;
  createdAt: Date;
  imageIds: string[];
}
