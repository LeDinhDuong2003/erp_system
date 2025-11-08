import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SalaryStatus, PaymentMethod } from '../../database/entities/EmployeeSalary.entity';

export class CreateEmployeeSalaryDto {
  @ApiProperty({
    description: 'Employee ID',
    example: 1,
  })
  @IsNumber()
  employee_id!: number;

  @ApiProperty({
    description: 'Salary month (ISO 8601 format, first day of month)',
    example: '2024-01-01',
  })
  @IsDateString()
  month!: string;

  @ApiProperty({
    description: 'Base salary',
    example: 10000000,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  base_salary?: number;

  @ApiProperty({
    description: 'Work hours',
    example: 160,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  work_hours?: number;

  @ApiProperty({
    description: 'Bonus amount',
    example: 500000,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @ApiProperty({
    description: 'Allowance amount',
    example: 200000,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  allowance?: number;

  @ApiProperty({
    description: 'Deduction amount',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deduction?: number;

  @ApiProperty({
    description: 'Total salary (calculated automatically if not provided)',
    example: 10700000,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_salary?: number;

  @ApiProperty({
    description: 'Salary status',
    enum: SalaryStatus,
    example: SalaryStatus.PENDING,
    required: false,
  })
  @IsEnum(SalaryStatus)
  @IsOptional()
  status?: SalaryStatus;

  @ApiProperty({
    description: 'Pay date (ISO 8601 format)',
    example: '2024-01-05',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  pay_date?: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
    required: false,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @ApiProperty({
    description: 'Payslip file URL',
    example: 'https://example.com/payslip.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  pay_slip_file?: string;
}
