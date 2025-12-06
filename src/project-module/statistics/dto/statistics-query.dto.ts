import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class StatisticsQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}

export class ProjectStatisticsQueryDto extends StatisticsQueryDto {
  @IsInt()
  @Type(() => Number)
  project_id: number;
}