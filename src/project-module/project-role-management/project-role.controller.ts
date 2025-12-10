import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ProjectRoleService } from './project-role.service';
import {
    CreateProjectRoleDto,
    UpdateProjectRoleDto,
    AssignPermissionDto,
    BulkAssignPermissionsDto,
    CopyPermissionsDto,
    RemovePermissionDto,
} from './dto/project-role.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../permission-system/project-permission.guard';
import { RequirePermission } from '../permission-system/require-permission.decorator';
import { PermissionScope } from 'src/database/entities/project-module/Permission.entity';

@Controller('projects/:projectId/roles')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class ProjectRoleController {
    constructor(private readonly projectRoleService: ProjectRoleService) {}

    // ==================== ROLE CRUD ====================

    /**
     * GET /projects/:projectId/roles
     * Lấy tất cả roles trong project
     * Permission: view_project (all members can view roles)
     */
    @Get()
    @RequirePermission('view_project')
    async getProjectRoles(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.projectRoleService.getProjectRoles(projectId);
    }

    /**
     * GET /projects/:projectId/roles/:roleId
     * Lấy chi tiết một role (bao gồm permissions)
     * Permission: view_project
     */
    @Get(':roleId')
    @RequirePermission('view_project')
    async getRoleDetail(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
    ) {
        return this.projectRoleService.getRoleDetail(projectId, roleId);
    }

    /**
     * POST /projects/:projectId/roles
     * Tạo role mới
     * Permission: administer_project (only admins can create roles)
     */
    @Post()
    @RequirePermission('administer_project')
    async createRole(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() createRoleDto: CreateProjectRoleDto,
    ) {
        return this.projectRoleService.createRole(projectId, createRoleDto);
    }

    /**
     * PUT /projects/:projectId/roles/:roleId
     * Update role
     * Permission: administer_project
     */
    @Put(':roleId')
    @RequirePermission('administer_project')
    async updateRole(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
        @Body() updateRoleDto: UpdateProjectRoleDto,
    ) {
        return this.projectRoleService.updateRole(projectId, roleId, updateRoleDto);
    }

    /**
     * DELETE /projects/:projectId/roles/:roleId
     * Xóa role
     * Permission: administer_project
     */
    @Delete(':roleId')
    @RequirePermission('administer_project')
    async deleteRole(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
    ) {
        return this.projectRoleService.deleteRole(projectId, roleId);
    }

    // ==================== PERMISSION MANAGEMENT ====================

    /**
     * GET /projects/:projectId/roles/:roleId/permissions
     * Lấy tất cả permissions của role
     * Permission: view_project
     */
    @Get(':roleId/permissions')
    @RequirePermission('view_project')
    async getRolePermissions(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
    ) {
        return this.projectRoleService.getRolePermissions(projectId, roleId);
    }

    /**
     * POST /projects/:projectId/roles/:roleId/permissions
     * Assign một permission cho role
     * Permission: administer_project
     */
    @Post(':roleId/permissions')
    @RequirePermission('administer_project')
    async assignPermission(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
        @Body() assignPermissionDto: AssignPermissionDto,
    ) {
        return this.projectRoleService.assignPermission(
            projectId,
            roleId,
            assignPermissionDto,
        );
    }

    /**
     * POST /projects/:projectId/roles/:roleId/permissions/bulk
     * Assign nhiều permissions cùng lúc
     * Permission: administer_project
     */
    @Post(':roleId/permissions/bulk')
    @RequirePermission('administer_project')
    async bulkAssignPermissions(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
        @Body() bulkAssignDto: BulkAssignPermissionsDto,
    ) {
        return this.projectRoleService.bulkAssignPermissions(
            projectId,
            roleId,
            bulkAssignDto,
        );
    }

    /**
     * DELETE /projects/:projectId/roles/:roleId/permissions
     * Remove một permission từ role
     * Permission: administer_project
     * Body: { action_key: string, recipient_type?: PermissionScope }
     */
    @Delete(':roleId/permissions')
    @RequirePermission('administer_project')
    async removePermission(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
        @Query('action_key') action_key: string,
        @Query('recipient_type') recipient_type?: PermissionScope,
    ) {
        const removePermissionDto: RemovePermissionDto = {
            action_key,
            recipient_type,
        };
        
        return this.projectRoleService.removePermission(
            projectId,
            roleId,
            removePermissionDto,
        );
    }

    /**
     * POST /projects/:projectId/roles/:roleId/permissions/copy
     * Copy permissions từ role khác
     * Permission: administer_project
     * Body: { source_role_id: number }
     */
    @Post(':roleId/permissions/copy')
    @RequirePermission('administer_project')
    async copyPermissions(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
        @Body() copyPermissionsDto: CopyPermissionsDto,
    ) {
        return this.projectRoleService.copyPermissions(
            projectId,
            roleId,
            copyPermissionsDto,
        );
    }

    /**
     * DELETE /projects/:projectId/roles/:roleId/permissions/all
     * Xóa tất cả permissions của role
     * Permission: administer_project
     */
    @Delete(':roleId/permissions/all')
    @RequirePermission('administer_project')
    async clearAllPermissions(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
    ) {
        return this.projectRoleService.clearAllPermissions(projectId, roleId);
    }
}