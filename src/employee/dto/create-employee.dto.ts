import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Gender, EmployeeRoleEnum, EmployeeStatus } from '../../database/entities/Employee.entity';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(100)
  employee_code: string;

  @IsString()
  @MaxLength(100)
  username: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @MaxLength(255)
  full_name: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  first_name?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  last_name?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  national_id?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(EmployeeRoleEnum)
  @IsOptional()
  role?: EmployeeRoleEnum;

  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  // Salary settings
  @IsOptional()
  base_salary?: number;

  @IsOptional()
  allowance?: number;

  @IsOptional()
  insurance_rate?: number;

  @IsOptional()
  overtime_rate?: number;
}

