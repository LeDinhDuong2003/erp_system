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

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly issueBoardService: IssueBoardService,
    ) {}

    @Post()
    create(@Body() createIssueDto: CreateIssueDto, @Request() req: any) {
        return this.issueService.create(createIssueDto, req.user.id);
    }

    @Get()
    findAll(@Query('search') search?: string, @Query('projectId', ParseIntPipe) projectId?: number) {
        return this.issueService.findAll(search, projectId);
    }

    @Get('types')
    getIssueTypes() {
        return this.issueService.getIssueTypes();
    }

    @Get('epics')
    getProjectEpics(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getProjectEpics(projectId);
    }

    @Get('statuses')
    getWorkflowStatuses(@Query('workflowId', ParseIntPipe) workflowId: number) {
        return this.issueService.getWorkflowStatuses(workflowId);
    }

    @Get('employees')
    getProjectEmployees(@Query('projectId', ParseIntPipe) projectId: number) {
        return this.issueService.getProjectEmployees(projectId);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.findOne(id);
    }

    @Get(':id/history')
    getIssueHistory(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getIssueHistory(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateIssueDto: UpdateIssueDto,
        @Request() req: any,
    ) {
        return this.issueService.update(id, updateIssueDto, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        return this.issueService.remove(id, req.user.id);
    }

    // -------------------- Assignees --------------------

    @Get(':id/assignees')
    getAssignees(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getAssignees(id);
    }

    @Post(':id/assignees')
    assignEmployee(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
        @Request() req: any,
    ) {
        return this.issueService.assignEmployee(id, assignEmployeeDto, req.user.id);
    }

    @Delete(':id/assignees/:employeeId')
    removeAssignee(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
        @Request() req: any,
    ) {
        return this.issueService.removeAssignee(id, employeeId, req.user.id);
    }

    // -------------------- Watchers --------------------

    @Get(':id/watchers')
    getWatchers(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getWatchers(id);
    }

    @Post(':id/watchers')
    addWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
        @Request() req: any,
    ) {
        return this.issueService.addWatcher(id, assignEmployeeDto, req.user.id);
    }

    @Delete(':id/watchers/:employeeId')
    removeWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
        @Request() req: any,
    ) {
        return this.issueService.removeWatcher(id, employeeId, req.user.id);
    }

    // -------------------- Issue Links --------------------

    @Get(':id/links')
    getIssueLinks(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getIssueLinks(id);
    }

    @Post(':id/links')
    createIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Body() createIssueLinkDto: CreateIssueLinkDto,
        @Request() req: any,
    ) {
        return this.issueService.createIssueLink(id, createIssueLinkDto, req.user.id);
    }

    @Delete(':id/links/:linkId')
    deleteIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Param('linkId', ParseIntPipe) linkId: number,
        @Request() req: any,
    ) {
        return this.issueService.deleteIssueLink(id, linkId, req.user.id);
    }

    // -------------------- Workflow Endpoints --------------------

    @Get('workflow/:workflowId/statuses')
    getIssuesByWorkflowStatus(@Param('workflowId', ParseIntPipe) workflowId: number): any {
        return this.issueBoardService.getIssuesByWorkflowStatus(workflowId);
    }

    @Patch('workflow/:workflowId/columns/reorder')
    reorderColumns(
        @Param('workflowId', ParseIntPipe) workflowId: number,
        @Body() reorderColumnsDto: ReorderColumnsDto,
    ) {
        return this.issueBoardService.reorderColumns(workflowId, reorderColumnsDto);
    }

    @Patch('status/:statusId/cards/reorder')
    reorderCards(
        @Param('statusId', ParseIntPipe) statusId: number,
        @Body() reorderCardsDto: ReorderCardsDto,
    ) {
        return this.issueBoardService.reorderCards(statusId, reorderCardsDto);
    }

    @Patch('card/:issueId/move')
    moveCard(
        @Param('issueId', ParseIntPipe) issueId: number,
        @Body() moveCardDto: MoveCardDto,
        @Request() req: any,
    ) {
        return this.issueBoardService.moveCard(issueId, moveCardDto, req.user.id);
    }
}