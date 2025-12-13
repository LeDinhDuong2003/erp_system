import { 
    Controller, Post, Body, Get, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, 
    Request
} from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateIssueLinkDto } from './dto/create-issue-link.dto';
import { IssueBoardService } from './status.service';
import { MoveCardDto, ReorderCardsDto, ReorderColumnsDto } from './dto/board-operations.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from 'src/project-module/permission-system/project-permission.guard';
import { RequirePermission } from 'src/project-module/permission-system/require-permission.decorator';

@Controller('issues')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly issueBoardService: IssueBoardService,
    ) {}

    // -------------------- CRUD Operations --------------------

    @Post()
    @RequirePermission('create_issue')
    create(@Body() createIssueDto: CreateIssueDto, @Request() req: any) {
        return this.issueService.create(createIssueDto, req.user.id);
    }

    @Get()
    @RequirePermission('browse_project')
    findAll(@Query('search') search?: string, @Query('projectId', ParseIntPipe) projectId?: number) {
        return this.issueService.findAll(search, projectId);
    }

    @Get('types')
    @RequirePermission('browse_project')
    getIssueTypes(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getIssueTypes(projectId);
    }

    @Get('epics')
    @RequirePermission('browse_project')
    getProjectEpics(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getProjectEpics(projectId);
    }

    @Get('statuses')
    @RequirePermission('browse_project')
    getWorkflowStatuses(
        @Query('workflowId', ParseIntPipe) workflowId: number,
        @Query('projectId', ParseIntPipe) projectId?: number,
    ) {
        return this.issueService.getWorkflowStatuses(workflowId);
    }

    @Get('employees')
    @RequirePermission('browse_project')
    getProjectEmployees(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getProjectEmployees(projectId);
    }

    // -------------------- NEW: Get Project Workflows --------------------
    /**
     * GET /issues/workflows?projectId=1
     * Lấy danh sách workflows của một project
     * Trả về: Array<{ id: number, workflow_name: string }>
     */
    @Get('workflows')
    @RequirePermission('browse_project')
    getProjectWorkflows(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getProjectWorkflows(projectId);
    }

    @Get(':id')
    @RequirePermission('browse_project')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.findOne(id);
    }

    @Get(':id/history')
    @RequirePermission('browse_project')
    getIssueHistory(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getIssueHistory(id);
    }

    @Patch(':id')
    @RequirePermission('edit_issue')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateIssueDto: UpdateIssueDto,
        @Request() req: any,
    ) {
        return this.issueService.update(id, updateIssueDto, req.user.id);
    }

    @Delete(':id')
    @RequirePermission('delete_issue')
    remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        return this.issueService.remove(id, req.user.id);
    }

    // -------------------- Assignees --------------------

    @Get(':id/assignees')
    @RequirePermission('browse_project')
    getAssignees(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getAssignees(id);
    }

    @Post(':id/assignees')
    @RequirePermission('assign_issue')
    assignEmployee(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
        @Request() req: any,
    ) {
        return this.issueService.assignEmployee(id, assignEmployeeDto, req.user.id);
    }

    @Delete(':id/assignees/:employeeId')
    @RequirePermission('assign_issue')
    removeAssignee(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
        @Request() req: any,
    ) {
        return this.issueService.removeAssignee(id, employeeId, req.user.id);
    }

    // -------------------- Watchers --------------------

    @Get(':id/watchers')
    @RequirePermission('browse_project')
    getWatchers(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getWatchers(id);
    }

    @Post(':id/watchers')
    @RequirePermission('manage_watchers')
    addWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
        @Request() req: any,
    ) {
        return this.issueService.addWatcher(id, assignEmployeeDto, req.user.id);
    }

    @Delete(':id/watchers/:employeeId')
    @RequirePermission('manage_watchers')
    removeWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
        @Request() req: any,
    ) {
        return this.issueService.removeWatcher(id, employeeId, req.user.id);
    }

    // -------------------- Issue Links --------------------

    @Get(':id/links')
    @RequirePermission('browse_project')
    getIssueLinks(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getIssueLinks(id);
    }

    @Post(':id/links')
    @RequirePermission('link_issues')
    createIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Body() createIssueLinkDto: CreateIssueLinkDto,
        @Request() req: any,
    ) {
        return this.issueService.createIssueLink(id, createIssueLinkDto, req.user.id);
    }

    @Delete(':id/links/:linkId')
    @RequirePermission('link_issues')
    deleteIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Param('linkId', ParseIntPipe) linkId: number,
        @Request() req: any,
    ) {
        return this.issueService.deleteIssueLink(id, linkId, req.user.id);
    }

    // -------------------- Workflow Endpoints --------------------

    /**
     * Get board data by workflow
     * ✅ Nhận projectId từ query params để check permission
     */
    @Get('workflow/:workflowId/statuses')
    @RequirePermission('browse_project')
    getIssuesByWorkflowStatus(
        @Param('workflowId', ParseIntPipe) workflowId: number,
        @Query('projectId', ParseIntPipe) projectId: number, // ✅ Thêm projectId param
    ): any {
        return this.issueBoardService.getIssuesByWorkflowStatus(workflowId, projectId);
    }

    /**
     * Reorder columns
     * ✅ Nhận projectId từ query params để check permission
     */
    @Patch('workflow/:workflowId/columns/reorder')
    @RequirePermission('edit_workflow')
    reorderColumns(
        @Param('workflowId', ParseIntPipe) workflowId: number,
        @Body() reorderColumnsDto: ReorderColumnsDto,
        @Query('projectId', ParseIntPipe) projectId: number, // ✅ Thêm projectId param
    ) {
        return this.issueBoardService.reorderColumns(workflowId, reorderColumnsDto);
    }

    /**
     * Reorder cards within status
     * ✅ Nhận projectId từ query params để check permission
     */
    @Patch('status/:statusId/cards/reorder')
    @RequirePermission('edit_issue')
    reorderCards(
        @Param('statusId', ParseIntPipe) statusId: number,
        @Body() reorderCardsDto: ReorderCardsDto,
        @Query('projectId', ParseIntPipe) projectId: number, // ✅ Thêm projectId param
    ) {
        return this.issueBoardService.reorderCards(statusId, reorderCardsDto);
    }

    /**
     * Move card to different status
     * Note: projectId được lấy từ issueId nên không cần thêm query param
     */
    @Patch('card/:issueId/move')
    @RequirePermission('transition_issue')
    moveCard(
        @Param('issueId', ParseIntPipe) issueId: number,
        @Body() moveCardDto: MoveCardDto,
        @Request() req: any,
        @Query('projectId', ParseIntPipe) projectId: number, // ✅ Thêm projectId param
    ) {
        return this.issueBoardService.moveCard(issueId, moveCardDto, req.user.id);
    }
}