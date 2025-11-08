import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({
    description: 'Position title',
    example: 'Software Engineer',
    maxLength: 150,
  })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiProperty({
    description: 'Position level (1-10)',
    example: 3,
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  level?: number;

  @ApiProperty({
    description: 'Position description',
    example: 'Responsible for developing and maintaining software applications',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

