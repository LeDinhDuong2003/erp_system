import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'ID nhân viên nhận tài sản', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  employee_id: number;

  @ApiProperty({ description: 'ID tài sản được phân công', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  asset_id: number;

  @ApiProperty({ description: 'Ngày bàn giao (YYYY-MM-DD). Nếu để trống mặc định là ngày hiện tại', required: false })
  @IsOptional()
  @IsDateString()
  assignment_date?: string;

  @ApiProperty({ description: 'Ghi chú / lý do bàn giao', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assignment_reason?: string;

  @ApiProperty({ description: 'Tình trạng khi giao (ví dụ: New, Good)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  condition_on_assignment?: string;
}