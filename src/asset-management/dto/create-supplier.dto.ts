import { IsNotEmpty, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {

  @ApiProperty({
    description: 'Mã nhà cung cấp (unique). Nếu để trống backend có thể sinh tự động',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplier_code?: string;

  @ApiProperty({
    description: 'Tên nhà cung cấp',
    example: 'Công ty TNHH ABC',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supplier_name: string;

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
