import { IsString, IsDateString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaveType } from '../../database/entities/LeaveRequest.entity';

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: 'Employee ID (auto-filled from token if not provided)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  employee_id!: number;

  @ApiProperty({
    description: 'Leave type',
    enum: LeaveType,
    example: LeaveType.ANNUAL,
  })
  @IsEnum(LeaveType)
  type!: LeaveType;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    example: '2024-02-01',
  })
  @IsDateString()
  start_date!: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    example: '2024-02-05',
  })
  @IsDateString()
  end_date!: string;

  @ApiProperty({
    description: 'Total days (calculated automatically if not provided)',
    example: 5,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_days?: number;

  @ApiProperty({
    description: 'Reason for leave',
    example: 'Family vacation',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
