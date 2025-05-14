import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  title: string;

  @IsOptional()
  @IsString()
  photoId?: string;
}
