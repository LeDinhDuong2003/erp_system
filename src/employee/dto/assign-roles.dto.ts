import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @IsNotEmpty()
  role_ids: string[];
}

