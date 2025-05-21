import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
