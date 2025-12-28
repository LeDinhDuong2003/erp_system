import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdateSupplierDto {

  @ApiProperty({
    description: 'Tên nhà cung cấp',
    required: false,
    example: 'Công ty TNHH ABC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplier_name?: string;

  @ApiProperty({
    description: 'Địa chỉ',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
