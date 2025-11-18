import { 
    Controller, Post, Body, Get, Patch, Param, Delete, ParseIntPipe, UseGuards, Query 
} from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateIssueLinkDto } from './dto/create-issue-link.dto';
import { IssueBoardService } from './status.service';
import { MoveCardDto, ReorderCardsDto, ReorderColumnsDto } from './dto/board-operations.dto';

@Controller('issues')
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly issueBoardService: IssueBoardService,
    ) {}

    @Post()
    create(@Body() createIssueDto: CreateIssueDto) {
        return this.issueService.create(createIssueDto);
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

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateIssueDto: UpdateIssueDto,
    ) {
        return this.issueService.update(id, updateIssueDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.remove(id);
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
    ) {
        return this.issueService.assignEmployee(id, assignEmployeeDto);
    }

    @Delete(':id/assignees/:employeeId')
    removeAssignee(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
    ) {
        return this.issueService.removeAssignee(id, employeeId);
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
    ) {
        return this.issueService.addWatcher(id, assignEmployeeDto);
    }

    @Delete(':id/watchers/:employeeId')
    removeWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Param('employeeId', ParseIntPipe) employeeId: number,
    ) {
        return this.issueService.removeWatcher(id, employeeId);
    }

    // -------------------- Comments --------------------

    // @Get(':id/comments')
    // getComments(@Param('id', ParseIntPipe) id: number) {
    //     return this.issueService.getComments(id);
    // }

    // @Post(':id/comments')
    // createComment(
    //     @Param('id', ParseIntPipe) id: number,
    //     @Body() createCommentDto: CreateCommentDto,
    // ) {
    //     return this.issueService.createComment(id, createCommentDto);
    // }

    // @Patch(':id/comments/:commentId')
    // updateComment(
    //     @Param('id', ParseIntPipe) id: number,
    //     @Param('commentId', ParseIntPipe) commentId: number,
    //     @Body() updateCommentDto: UpdateCommentDto,
    // ) {
    //     return this.issueService.updateComment(id, commentId, updateCommentDto);
    // }

    // @Delete(':id/comments/:commentId')
    // deleteComment(
    //     @Param('id', ParseIntPipe) id: number,
    //     @Param('commentId', ParseIntPipe) commentId: number,
    // ) {
    //     return this.issueService.deleteComment(id, commentId);
    // }

    // -------------------- Issue Links --------------------

    @Get(':id/links')
    getIssueLinks(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getIssueLinks(id);
    }

    @Post(':id/links')
    createIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Body() createIssueLinkDto: CreateIssueLinkDto,
    ) {
        return this.issueService.createIssueLink(id, createIssueLinkDto);
    }

    @Delete(':id/links/:linkId')
    deleteIssueLink(
        @Param('id', ParseIntPipe) id: number,
        @Param('linkId', ParseIntPipe) linkId: number,
    ) {
        return this.issueService.deleteIssueLink(id, linkId);
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
    ) {
        return this.issueBoardService.moveCard(issueId, moveCardDto);
    }
}