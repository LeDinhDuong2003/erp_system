import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Param,
    Body,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { AddMemberDto, AddMultipleMembersDto } from './dto/add-member.dto';
import { AssignRoleDto, BulkAssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../permission-system/project-permission.guard';
import { RequirePermission } from '../permission-system/require-permission.decorator';

@Controller('projects/:projectId/team')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class TeamController {
    constructor(private readonly teamService: TeamService) {}

    // -------------------- Get Members --------------------

    /**
     * GET /projects/:projectId/team
     * Lấy danh sách tất cả thành viên trong project
     * Permission: view_project (any member can view team)
     */
    @Get()
    @RequirePermission('view_project')
    async getProjectMembers(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.teamService.getProjectMembers(projectId);
    }

    /**
     * GET /projects/:projectId/team/:employeeId
     * Lấy thông tin chi tiết một thành viên
     * Permission: view_project
     */
    @Get(':employeeId')
    @RequirePermission('view_project')
    async getMemberDetail(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
    ) {
        return this.teamService.getMemberDetail(projectId, employeeId);
    }

    /**
     * GET /projects/:projectId/team/statistics/overview
     * Lấy thống kê về team
     * Permission: view_project
     */
    @Get('statistics/overview')
    @RequirePermission('view_project')
    async getTeamStatistics(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.teamService.getTeamStatistics(projectId);
    }

    // -------------------- Add Members --------------------

    /**
     * POST /projects/:projectId/team
     * Thêm một thành viên vào project
     * Permission: administer_project (only admins can add members)
     */
    @Post()
    @RequirePermission('administer_project')
    async addMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() addMemberDto: AddMemberDto,
        @Request() req: any,
    ) {
        return this.teamService.addMember(projectId, addMemberDto, req.user.id);
    }

    /**
     * POST /projects/:projectId/team/bulk-add
     * Thêm nhiều thành viên cùng lúc
     * Permission: administer_project
     */
    @Post('bulk-add')
    @RequirePermission('administer_project')
    async addMultipleMembers(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() addMultipleMembersDto: AddMultipleMembersDto,
        @Request() req: any,
    ) {
        return this.teamService.addMultipleMembers(
            projectId,
            addMultipleMembersDto,
            req.user.id,
        );
    }

    // -------------------- Assign/Change Roles --------------------

    /**
     * PATCH /projects/:projectId/team/:employeeId/role
     * Gán/thay đổi role cho một thành viên
     * Permission: administer_project (only admins can change roles)
     */
    @Patch(':employeeId/role')
    @RequirePermission('administer_project')
    async assignRole(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
        @Body() assignRoleDto: AssignRoleDto,
        @Request() req: any,
    ) {
        return this.teamService.assignRole(
            projectId,
            employeeId,
            assignRoleDto,
            req.user.id,
        );
    }

    /**
     * PATCH /projects/:projectId/team/bulk-assign-role
     * Gán role cho nhiều thành viên cùng lúc
     * Permission: administer_project
     */
    @Patch('bulk-assign-role')
    @RequirePermission('administer_project')
    async bulkAssignRole(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() bulkAssignRoleDto: BulkAssignRoleDto,
        @Request() req: any,
    ) {
        return this.teamService.bulkAssignRole(
            projectId,
            bulkAssignRoleDto,
            req.user.id,
        );
    }

    // -------------------- Remove Members --------------------

    /**
     * DELETE /projects/:projectId/team/:employeeId
     * Xóa một thành viên khỏi project
     * Permission: administer_project (only admins can remove members)
     */
    @Delete(':employeeId')
    @RequirePermission('administer_project')
    async removeMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
    ) {
        return this.teamService.removeMember(projectId, employeeId);
    }

    /**
     * DELETE /projects/:projectId/team/bulk-remove/execute
     * Xóa nhiều thành viên cùng lúc
     * Permission: administer_project
     * Body: { employee_ids: number[] }
     */
    @Delete('bulk-remove/execute')
    @RequirePermission('administer_project')
    async removeMultipleMembers(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() body: { employee_ids: number[] },
    ) {
        return this.teamService.removeMultipleMembers(projectId, body.employee_ids);
    }

    // -------------------- Utility Endpoints --------------------

    /**
     * GET /projects/:projectId/team/roles/available
     * Lấy danh sách các role có sẵn
     * Permission: view_project (anyone can view available roles)
     */
    @Get('roles/available')
    @RequirePermission('view_project')
    async getAvailableRoles() {
        return this.teamService.getAvailableRoles();
    }

    /**
     * GET /projects/:projectId/team/non-members/list
     * Lấy danh sách employees chưa là thành viên
     * Permission: administer_project (only admins need to see potential members)
     */
    @Get('non-members/list')
    @RequirePermission('administer_project')
    async getNonMembers(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.teamService.getNonMembers(projectId);
    }
}