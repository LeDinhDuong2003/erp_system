import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  project_key: string;

  @IsString()
  @IsNotEmpty()
  project_name: string;

  @IsNumber()
  @IsNotEmpty()
  lead_employee_id: number;

  @IsNumber()
  @IsNotEmpty()
  permission_scheme_id: number;

  @IsNumber()
  @IsNotEmpty()
  notification_scheme_id: number;

  @IsNumber()
  @IsNotEmpty()
  workflow_scheme_id: number;
}