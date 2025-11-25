import { IsNotEmpty, IsString, IsInt, IsOptional, MaxLength, IsDateString, IsIn } from 'class-validator';

export class CreateSprintDto {
  @IsInt()
  @IsNotEmpty()
  project_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sprint_name: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsInt()
  duration_days?: number;

  @IsOptional()
  @IsString()
  @IsIn(['planning', 'active', 'completed', 'closed'])
  status?: string;
}