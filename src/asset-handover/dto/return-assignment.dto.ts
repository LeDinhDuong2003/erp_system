import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, MaxLength, IsNumber } from 'class-validator';

export class ReturnAssignmentDto {
  @ApiProperty({ description: 'Ngày thu hồi (YYYY-MM-DD). Nếu để trống backend sẽ dùng ngày hiện tại', required: false })
  @IsOptional()
  @IsDateString()
  return_date?: string;

  @ApiProperty({ description: 'Lý do thu hồi', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  return_reason?: string;

  @ApiProperty({ description: 'Tình trạng khi trả', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  condition_on_return?: string;

  @ApiProperty({ description: 'ID người thu hồi (employee) — nếu backend cần ghi rõ', required: false })
  @IsOptional()
  @IsNumber()
  returned_by_id?: number;
}