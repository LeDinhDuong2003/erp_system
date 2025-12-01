import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
    ProjectRole,
    ProjectPermission,
    PermissionScheme,
    ProjectRoleAssignment,
    PermissionScope,
} from '../../database/entities/project-module/Permission.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import {
    CreateProjectRoleDto,
    UpdateProjectRoleDto,
    AssignPermissionDto,
    BulkAssignPermissionsDto,
    CopyPermissionsDto,
    RemovePermissionDto,
} from './dto/project-role.dto';

@Injectable()
export class ProjectRoleService {
    constructor(
        @InjectRepository(ProjectRole)
        private readonly projectRoleRepository: Repository<ProjectRole>,

        @InjectRepository(ProjectPermission)
        private readonly permissionRepository: Repository<ProjectPermission>,

        @InjectRepository(PermissionScheme)
        private readonly permissionSchemeRepository: Repository<PermissionScheme>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,

        @InjectRepository(ProjectRoleAssignment)
        private readonly roleAssignmentRepository: Repository<ProjectRoleAssignment>,

        private readonly dataSource: DataSource,
    ) {}

    // ==================== ROLE CRUD ====================

    /**
     * Lấy tất cả roles trong permission scheme của project
     */
    async getProjectRoles(projectId: number): Promise<any[]> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const roles = await this.projectRoleRepository.find({
            where: { permission_scheme_id: project.permission_scheme_id },
            order: { role_name: 'ASC' },
        });

        // Count members for each role
        const rolesWithCount = await Promise.all(
            roles.map(async (role) => {
                const memberCount = await this.roleAssignmentRepository.count({
                    where: {
                        project_id: projectId,
                        project_role_id: role.id,
                    },
                });

                return {
                    id: role.id,
                    role_name: role.role_name,
                    role_description: role.role_description,
                    permission_scheme_id: role.permission_scheme_id,
                    member_count: memberCount,
                    created_at: role.created_at,
                };
            }),
        );

        return rolesWithCount;
    }

    /**
     * Lấy chi tiết một role
     */
    async getRoleDetail(projectId: number, roleId: number): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(
                `Role with ID ${roleId} not found in this project's permission scheme`,
            );
        }

        // Get permissions for this role
        const permissions = await this.permissionRepository.find({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                project_role_id: roleId,
            },
            order: { action_key: 'ASC' },
        });

        // Count members
        const memberCount = await this.roleAssignmentRepository.count({
            where: {
                project_id: projectId,
                project_role_id: roleId,
            },
        });

        return {
            id: role.id,
            role_name: role.role_name,
            role_description: role.role_description,
            permission_scheme_id: role.permission_scheme_id,
            member_count: memberCount,
            permissions: permissions.map((p) => ({
                id: p.id,
                action_key: p.action_key,
                recipient_type: p.recipient_type,
                specific_employee_id: p.specific_employee_id,
                group_name: p.group_name,
            })),
            created_at: role.created_at,
        };
    }

    /**
     * Tạo role mới cho project
     */
    async createRole(
        projectId: number,
        createRoleDto: CreateProjectRoleDto,
    ): Promise<ProjectRole> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Check if role name already exists in this scheme
        const existingRole = await this.projectRoleRepository.findOne({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                role_name: createRoleDto.role_name,
            },
        });

        if (existingRole) {
            throw new ConflictException(
                `Role with name "${createRoleDto.role_name}" already exists in this permission scheme`,
            );
        }

        const newRole = this.projectRoleRepository.create({
            ...createRoleDto,
            permission_scheme_id: project.permission_scheme_id,
        });

        return await this.projectRoleRepository.save(newRole);
    }

    /**
     * Update role
     */
    async updateRole(
        projectId: number,
        roleId: number,
        updateRoleDto: UpdateProjectRoleDto,
    ): Promise<ProjectRole> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(
                `Role with ID ${roleId} not found in this project's permission scheme`,
            );
        }

        // Check if new name conflicts
        if (updateRoleDto.role_name && updateRoleDto.role_name !== role.role_name) {
            const existingRole = await this.projectRoleRepository.findOne({
                where: {
                    permission_scheme_id: project.permission_scheme_id,
                    role_name: updateRoleDto.role_name,
                },
            });

            if (existingRole) {
                throw new ConflictException(
                    `Role with name "${updateRoleDto.role_name}" already exists`,
                );
            }
        }

        // Prevent renaming default roles
        const defaultRoleNames = ['Administrator', 'Member', 'Viewer'];
        if (
            defaultRoleNames.includes(role.role_name) &&
            updateRoleDto.role_name &&
            updateRoleDto.role_name !== role.role_name
        ) {
            throw new BadRequestException(
                `Cannot rename default role "${role.role_name}"`,
            );
        }

        await this.projectRoleRepository.update(roleId, updateRoleDto);

        return await this.projectRoleRepository.findOne({ where: { id: roleId } }) as ProjectRole;
    }

    /**
     * Xóa role
     */
    async deleteRole(projectId: number, roleId: number): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        // Prevent deleting default roles
        const defaultRoleNames = ['Administrator', 'Member', 'Viewer'];
        if (defaultRoleNames.includes(role.role_name)) {
            throw new BadRequestException(
                `Cannot delete default role "${role.role_name}"`,
            );
        }

        // Check if any members are assigned to this role
        const memberCount = await this.roleAssignmentRepository.count({
            where: {
                project_id: projectId,
                project_role_id: roleId,
            },
        });

        if (memberCount > 0) {
            throw new BadRequestException(
                `Cannot delete role "${role.role_name}" because ${memberCount} members are assigned to it. ` +
                    `Please reassign these members to another role first.`,
            );
        }

        await this.dataSource.transaction(async (manager) => {
            // Delete all permissions for this role
            await manager.delete(ProjectPermission, {
                permission_scheme_id: project.permission_scheme_id,
                project_role_id: roleId,
            });

            // Delete the role
            await manager.delete(ProjectRole, { id: roleId });
        });

        return {
            message: 'Role deleted successfully',
            role_name: role.role_name,
        };
    }

    // ==================== PERMISSION MANAGEMENT ====================

    /**
     * Lấy tất cả permissions của một role
     */
    async getRolePermissions(projectId: number, roleId: number): Promise<any[]> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        const permissions = await this.permissionRepository.find({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                project_role_id: roleId,
            },
            order: { action_key: 'ASC' },
        });

        return permissions.map((p) => ({
            id: p.id,
            action_key: p.action_key,
            recipient_type: p.recipient_type,
            specific_employee_id: p.specific_employee_id,
            group_name: p.group_name,
        }));
    }

    /**
     * Assign một permission cho role
     */
    async assignPermission(
        projectId: number,
        roleId: number,
        assignPermissionDto: AssignPermissionDto,
    ): Promise<ProjectPermission> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        // Check if permission already exists
        const existingPermission = await this.permissionRepository.findOne({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                project_role_id: roleId,
                action_key: assignPermissionDto.action_key,
                recipient_type: assignPermissionDto.recipient_type,
            },
        });

        if (existingPermission) {
            throw new ConflictException(
                `Permission "${assignPermissionDto.action_key}" with recipient type "${assignPermissionDto.recipient_type}" already exists for this role`,
            );
        }

        const permission = this.permissionRepository.create({
            permission_scheme_id: project.permission_scheme_id,
            project_role_id: roleId,
            action_key: assignPermissionDto.action_key,
            recipient_type: assignPermissionDto.recipient_type,
            specific_employee_id: assignPermissionDto.specific_employee_id,
            group_name: assignPermissionDto.group_name,
        });

        return await this.permissionRepository.save(permission);
    }

    /**
     * Assign nhiều permissions cùng lúc
     */
    async bulkAssignPermissions(
        projectId: number,
        roleId: number,
        bulkAssignDto: BulkAssignPermissionsDto,
    ): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        const results: Array<{
            action_key: string;
            success: boolean;
            error?: string;
        }> = [];

        await this.dataSource.transaction(async (manager) => {
            for (const permDto of bulkAssignDto.permissions) {
                try {
                    // Check if exists
                    const existing = await manager.findOne(ProjectPermission, {
                        where: {
                            permission_scheme_id: project.permission_scheme_id,
                            project_role_id: roleId,
                            action_key: permDto.action_key,
                            recipient_type: permDto.recipient_type,
                        },
                    });

                    if (existing) {
                        results.push({
                            action_key: permDto.action_key,
                            success: false,
                            error: 'Permission already exists',
                        });
                        continue;
                    }

                    const permission = manager.create(ProjectPermission, {
                        permission_scheme_id: project.permission_scheme_id,
                        project_role_id: roleId,
                        action_key: permDto.action_key,
                        recipient_type: permDto.recipient_type,
                        specific_employee_id: permDto.specific_employee_id,
                        group_name: permDto.group_name,
                    });

                    await manager.save(permission);

                    results.push({
                        action_key: permDto.action_key,
                        success: true,
                    });
                } catch (error: any) {
                    results.push({
                        action_key: permDto.action_key,
                        success: false,
                        error: error.message,
                    });
                }
            }
        });

        const successCount = results.filter((r) => r.success).length;

        return {
            message: `Assigned ${successCount} of ${bulkAssignDto.permissions.length} permissions`,
            total: bulkAssignDto.permissions.length,
            success: successCount,
            failed: bulkAssignDto.permissions.length - successCount,
            results,
        };
    }

    /**
     * Remove một permission từ role
     */
    async removePermission(
        projectId: number,
        roleId: number,
        removePermissionDto: RemovePermissionDto,
    ): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        const whereCondition: any = {
            permission_scheme_id: project.permission_scheme_id,
            project_role_id: roleId,
            action_key: removePermissionDto.action_key,
        };

        if (removePermissionDto.recipient_type) {
            whereCondition.recipient_type = removePermissionDto.recipient_type;
        }

        const permission = await this.permissionRepository.findOne({
            where: whereCondition,
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        await this.permissionRepository.delete(permission.id);

        return {
            message: 'Permission removed successfully',
            action_key: removePermissionDto.action_key,
        };
    }

    /**
     * Copy tất cả permissions từ role khác
     */
    async copyPermissions(
        projectId: number,
        targetRoleId: number,
        copyPermissionsDto: CopyPermissionsDto,
    ): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Validate target role
        const targetRole = await this.projectRoleRepository.findOne({
            where: {
                id: targetRoleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!targetRole) {
            throw new NotFoundException(`Target role with ID ${targetRoleId} not found`);
        }

        // Validate source role
        const sourceRole = await this.projectRoleRepository.findOne({
            where: {
                id: copyPermissionsDto.source_role_id,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!sourceRole) {
            throw new NotFoundException(
                `Source role with ID ${copyPermissionsDto.source_role_id} not found`,
            );
        }

        // Get source permissions
        const sourcePermissions = await this.permissionRepository.find({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                project_role_id: copyPermissionsDto.source_role_id,
            },
        });

        if (sourcePermissions.length === 0) {
            throw new BadRequestException('Source role has no permissions to copy');
        }

        let copiedCount = 0;
        let skippedCount = 0;

        await this.dataSource.transaction(async (manager) => {
            for (const sourcePerm of sourcePermissions) {
                // Check if permission already exists in target
                const existing = await manager.findOne(ProjectPermission, {
                    where: {
                        permission_scheme_id: project.permission_scheme_id,
                        project_role_id: targetRoleId,
                        action_key: sourcePerm.action_key,
                        recipient_type: sourcePerm.recipient_type,
                    },
                });

                if (existing) {
                    skippedCount++;
                    continue;
                }

                // Create new permission for target role
                const newPermission = manager.create(ProjectPermission, {
                    permission_scheme_id: project.permission_scheme_id,
                    project_role_id: targetRoleId,
                    action_key: sourcePerm.action_key,
                    recipient_type: sourcePerm.recipient_type,
                    specific_employee_id: sourcePerm.specific_employee_id,
                    group_name: sourcePerm.group_name,
                });

                await manager.save(newPermission);
                copiedCount++;
            }
        });

        return {
            message: `Copied ${copiedCount} permissions from "${sourceRole.role_name}" to "${targetRole.role_name}"`,
            source_role: sourceRole.role_name,
            target_role: targetRole.role_name,
            total_permissions: sourcePermissions.length,
            copied: copiedCount,
            skipped: skippedCount,
        };
    }

    /**
     * Xóa tất cả permissions của role
     */
    async clearAllPermissions(projectId: number, roleId: number): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const role = await this.projectRoleRepository.findOne({
            where: {
                id: roleId,
                permission_scheme_id: project.permission_scheme_id,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        // Prevent clearing default roles' permissions
        const defaultRoleNames = ['Administrator'];
        if (defaultRoleNames.includes(role.role_name)) {
            throw new BadRequestException(
                `Cannot clear permissions of default role "${role.role_name}"`,
            );
        }

        const deleteResult = await this.permissionRepository.delete({
            permission_scheme_id: project.permission_scheme_id,
            project_role_id: roleId,
        });

        return {
            message: 'All permissions cleared successfully',
            role_name: role.role_name,
            deleted_count: deleteResult.affected || 0,
        };
    }
}