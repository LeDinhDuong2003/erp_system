import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ApproveRequestDto {
  @ApiProperty({ description: 'Ghi chú phê duyệt', required: false })
  @IsOptional()
  @IsString()
  approval_note?: string;

  @ApiProperty({ description: 'Chi phí ước tính (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_cost?: number;
}