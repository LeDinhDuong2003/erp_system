import { IsNotEmpty, IsInt } from 'class-validator';

export class AssignRoleDto {
  @IsInt()
  @IsNotEmpty()
  project_role_id: number;
}

export class BulkAssignRoleDto {
  @IsInt({ each: true })
  @IsNotEmpty()
  employee_ids: number[];

  @IsInt()
  @IsNotEmpty()
  project_role_id: number;
}