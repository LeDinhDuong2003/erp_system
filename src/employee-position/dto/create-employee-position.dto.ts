import { IsNumber, IsDateString, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeePositionDto {
  @ApiProperty({
    description: 'Employee ID',
    example: 1,
  })
  @IsNumber()
  employee_id!: number;

  @ApiProperty({
    description: 'Department ID',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  department_id?: number;

  @ApiProperty({
    description: 'Position ID',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  position_id?: number;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    example: '2024-01-01',
  })
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({
    description: 'Contract file URL',
    example: 'https://example.com/contract.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  contract_file?: string;

  @ApiProperty({
    description: 'Is this the current position?',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_current?: boolean;
}
