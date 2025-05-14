import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  @IsOptional()
  activationToken?: string;
}
