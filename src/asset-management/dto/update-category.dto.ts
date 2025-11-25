import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ description: 'Tên loại tài sản', example: 'Laptop' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category_name?: string;

  @ApiProperty({ description: 'Mô tả', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}