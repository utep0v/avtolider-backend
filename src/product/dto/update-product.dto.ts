import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  imageIds?: string[];
}
