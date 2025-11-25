import { IsNotEmpty, IsString, IsInt, IsOptional, MaxLength } from 'class-validator';

export class CreateIssueDto {
  @IsInt()
  @IsNotEmpty()
  project_id: number;

  @IsInt()
  @IsNotEmpty()
  issue_type_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  summary: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  current_status_id: number;

  @IsInt()
  @IsNotEmpty()
  reporter_id: number;

  @IsOptional()
  @IsInt()
  epic_link_id?: number;

  @IsOptional()
  @IsInt()
  story_points?: number;

  @IsOptional()
  @IsInt()
  original_estimate_seconds?: number;
  
  @IsOptional()
  @IsInt()
  time_spent_seconds?: number;
  
  @IsOptional()
  @IsString()
  resolution?: string;
}