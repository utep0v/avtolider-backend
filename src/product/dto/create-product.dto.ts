import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsUUID()
  @IsNotEmpty()
  subcategoryId: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  imageIds?: string[];
}
