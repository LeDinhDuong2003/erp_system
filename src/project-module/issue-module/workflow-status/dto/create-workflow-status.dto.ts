import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class CreateWorkflowStatusDto {
  @IsInt()
  @IsNotEmpty()
  workflow_id!: number;

  @IsString()
  @IsNotEmpty()
  status_name!: string;

  @IsString()
  @IsOptional()
  status_category?: string;

  @IsBoolean()
  @IsOptional()
  is_initial_status?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order_index?: number;
}