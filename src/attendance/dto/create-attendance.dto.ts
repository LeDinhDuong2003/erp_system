import { IsNumber, IsDateString, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({
    description: 'Employee ID',
    example: 1,
  })
  @IsNumber()
  employee_id!: number;

  @ApiProperty({
    description: 'Attendance date (ISO 8601 format)',
    example: '2024-01-15',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Check-in time (ISO 8601 format)',
    example: '2024-01-15T08:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  check_in?: string;

  @ApiProperty({
    description: 'Check-out time (ISO 8601 format)',
    example: '2024-01-15T17:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  check_out?: string;

  @ApiProperty({
    description: 'Late minutes',
    example: 15,
    minimum: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  late_minutes?: number;

  @ApiProperty({
    description: 'Early leave minutes',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  early_leave_minutes?: number;

  @ApiProperty({
    description: 'Note',
    example: 'Worked from home',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
