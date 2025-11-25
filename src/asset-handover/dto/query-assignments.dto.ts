import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNumberString } from 'class-validator';

export class QueryAssignmentsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  pageSize?: number;

  @ApiProperty({ required: false, description: 'Tìm theo tên nhân viên hoặc mã tài sản hoặc tên tài sản' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Lọc theo nhân viên, truyền employee_id' })
  @IsOptional()
  employeeId?: number;

  @ApiProperty({ required: false, description: 'Trạng thái ASSIGNED|RETURNED' })
  @IsOptional()
  @IsIn(['ASSIGNED', 'RETURNED'])
  status?: string;

  @ApiProperty({ required: false, description: 'Trường sắp xếp', example: 'assignment_date' })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({ required: false, description: 'ASC hoặc DESC' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}