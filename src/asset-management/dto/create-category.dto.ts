import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Mã loại tài sản (unique). Nếu để trống backend có thể sinh tự động', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category_code?: string;

  @ApiProperty({ description: 'Tên loại tài sản', example: 'Laptop' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category_name: string;

  @ApiProperty({ description: 'Mô tả', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}