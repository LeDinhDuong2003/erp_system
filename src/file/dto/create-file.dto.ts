import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileCategory } from '../../database/entities/File.entity';

export class CreateFileDto {
  @ApiProperty({
    description: 'Employee ID (if file is associated with an employee)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  employee_id?: number;

  @ApiProperty({
    description: 'File name',
    example: 'resume.pdf',
  })
  @IsString()
  file_name!: string;

  @ApiProperty({
    description: 'File type/extension',
    example: 'pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  file_type?: string;

  @ApiProperty({
    description: 'File URL',
    example: 'https://example.com/files/resume.pdf',
  })
  @IsString()
  file_url!: string;

  @ApiProperty({
    description: 'File category',
    enum: FileCategory,
    example: FileCategory.RESUME,
    required: false,
  })
  @IsEnum(FileCategory)
  @IsOptional()
  category?: FileCategory;
}
