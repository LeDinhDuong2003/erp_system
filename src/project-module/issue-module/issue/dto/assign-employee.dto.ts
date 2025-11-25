import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignEmployeeDto {
  @IsInt()
  @IsNotEmpty()
  employee_id: number;
}