import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionScope } from '../../../database/entities/project-module/Permission.entity';

/**
 * DTO để tạo role mới trong project
 */
export class CreateProjectRoleDto {
    @IsString()
    role_name: string;

    @IsString()
    @IsOptional()
    role_description?: string;
}

/**
 * DTO để update role
 */
export class UpdateProjectRoleDto {
    @IsString()
    @IsOptional()
    role_name?: string;

    @IsString()
    @IsOptional()
    role_description?: string;
}

/**
 * DTO để assign permission cho role
 */
export class AssignPermissionDto {
    @IsString()
    action_key: string;

    @IsEnum(PermissionScope)
    recipient_type: PermissionScope;

    @IsNumber()
    @IsOptional()
    specific_employee_id?: number;

    @IsString()
    @IsOptional()
    group_name?: string;
}

/**
 * DTO để assign nhiều permissions cùng lúc
 */
export class BulkAssignPermissionsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssignPermissionDto)
    permissions: AssignPermissionDto[];
}

/**
 * DTO để copy permissions từ role khác
 */
export class CopyPermissionsDto {
    @IsNumber()
    source_role_id: number;
}

/**
 * DTO để remove permission từ role
 */
export class RemovePermissionDto {
    @IsString()
    action_key: string;

    @IsEnum(PermissionScope)
    @IsOptional()
    recipient_type?: PermissionScope;
}