import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CompleteRequestDto {
  @ApiProperty({ description: 'Ngày hoàn thành (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  completion_date?: string;

  @ApiProperty({ description: 'Chi phí thực tế (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cost?: number;

  @ApiProperty({ description: 'Ghi chú kết quả', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  result_note?: string;
}