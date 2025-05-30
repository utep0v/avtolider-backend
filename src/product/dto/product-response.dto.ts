export class ProductResponseDto {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  category: any;
  subcategory: any;
  createdAt: Date;
  imageIds: string[];
}
