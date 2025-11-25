import { IsNotEmpty, IsString, IsInt, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreateEpicDto {
  @IsInt()
  @IsNotEmpty()
  project_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  epic_name: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}