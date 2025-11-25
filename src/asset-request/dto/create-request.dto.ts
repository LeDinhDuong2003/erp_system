import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  IsDateString,
  IsInt,
} from 'class-validator';
import {
  RequestType,
  RequestPriority,
} from '../../database/assetrequest/request.entity';

export class CreateRequestDto {
  @ApiProperty({ enum: RequestType, description: 'Loại yêu cầu' })
  @IsNotEmpty()
  @IsEnum(RequestType)
  request_type: RequestType;

  @ApiProperty({ description: 'Lý do yêu cầu' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason: string;

  // PURCHASE fields
  @ApiProperty({ description: 'ID loại tài sản (dùng cho PURCHASE)', required: false })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiProperty({ description: 'Tên tài sản đề xuất (PURCHASE)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  asset_name_suggest?: string;

  @ApiProperty({ description: 'Số lượng (PURCHASE)', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  // REPAIR / MAINTENANCE fields
  @ApiProperty({ description: 'ID tài sản (REPAIR/MAINTENANCE)', required: false })
  @IsOptional()
  @IsInt()
  asset_id?: number;

  @ApiProperty({ description: 'Ngày cần (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  needed_date?: string;

  @ApiProperty({ enum: RequestPriority, default: RequestPriority.MEDIUM, required: false })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiProperty({ description: 'URL hình ảnh đính kèm', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}