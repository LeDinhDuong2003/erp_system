import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateWorkflowStatusDto {
  @IsString()
  @IsOptional()
  status_name?: string;

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