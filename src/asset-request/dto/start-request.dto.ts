import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class StartRequestDto {
  @ApiProperty({ description: 'Ngày bắt đầu (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;
}