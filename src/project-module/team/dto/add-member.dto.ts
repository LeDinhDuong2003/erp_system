import { IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class AddMemberDto {
  @IsInt()
  @IsNotEmpty()
  employee_id: number;

  @IsInt()
  @IsNotEmpty()
  project_role_id: number;
}

export class AddMultipleMembersDto {
  @IsNotEmpty()
  members: AddMemberDto[];
}