import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({
    description: 'Report type',
    example: 'Monthly Attendance',
  })
  @IsString()
  type!: string;

  @ApiProperty({
    description: 'Report title',
    example: 'January 2024 Attendance Report',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Report file URL',
    example: 'https://example.com/reports/january-2024.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  file_url?: string;

  @ApiProperty({
    description: 'Report parameters (JSON object)',
    example: { month: '2024-01', department: 'Engineering' },
    required: false,
  })
  @IsOptional()
  params?: Record<string, any>;
}
