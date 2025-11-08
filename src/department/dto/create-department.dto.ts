import { IsString, IsOptional, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Engineering',
    maxLength: 150,
  })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    description: 'Parent department ID (for hierarchical structure)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  parent_id?: number;

  @ApiProperty({
    description: 'Department description',
    example: 'Software development and engineering department',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

