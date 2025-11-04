import { IsArray, IsNotEmpty } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @IsNotEmpty()
  permission_ids: string[];
}

