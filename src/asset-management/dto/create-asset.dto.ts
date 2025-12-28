import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { AssetStatus } from '../../database/assetmanagement/asset.entity';

export class CreateAssetDto {
  @ApiProperty({ description: 'Mã tài sản (unique)', example: 'ASSET-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  asset_code: string;

  @ApiProperty({ description: 'Tên tài sản' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  asset_name: string;

  @ApiProperty({ description: 'ID loại tài sản', example: 1 })
  @IsNotEmpty()
  category_id: number;

  @ApiProperty({ description: 'ID nhà cung cấp', example: 1 })
  @IsNotEmpty()
  supplier_id?: number;

  @ApiProperty({ description: 'Giá trị (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Ngày mua (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiProperty({ description: 'Trạng thái', enum: AssetStatus, required: false })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiProperty({ description: 'Mô tả', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'URL ảnh', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiProperty({ description: 'ID người hiện đang giữ (employee)', required: false })
  @IsOptional()
  current_holder_id?: number;
}