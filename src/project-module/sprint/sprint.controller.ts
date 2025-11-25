import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { SprintService } from './sprint.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import {
    ChangeSprintStatusDto,
    AddIssueToSprintDto,
    MoveIssueBetweenSprintsDto,
    BulkMoveIssuesDto,
    ReorderSprintIssuesDto,
} from './dto/sprint-operation.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintController {
    constructor(private readonly sprintService: SprintService) {}

    // -------------------- CRUD Operations --------------------

    @Post()
    create(@Body() createSprintDto: CreateSprintDto) {
        return this.sprintService.create(createSprintDto);
    }

    @Get()
    findAll(@Query('projectId', ParseIntPipe) projectId?: number) {
        return this.sprintService.findAll(projectId);
    }

    @Get('backlog/:projectId')
    getBacklog(@Param('projectId', ParseIntPipe) projectId: number) {
        return this.sprintService.getBacklog(projectId);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.sprintService.findOne(id);
    }

    @Get(':id/issues')
    getSprintIssues(@Param('id', ParseIntPipe) id: number) {
        return this.sprintService.getSprintIssues(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateSprintDto: UpdateSprintDto,
    ) {
        return this.sprintService.update(id, updateSprintDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.sprintService.remove(id);
    }

    // -------------------- Sprint Status Management --------------------

    @Patch(':id/status')
    changeStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() changeStatusDto: ChangeSprintStatusDto,
    ) {
        return this.sprintService.changeStatus(id, changeStatusDto);
    }

    @Post(':id/start')
    startSprint(@Param('id', ParseIntPipe) id: number) {
        return this.sprintService.startSprint(id);
    }

    @Post(':id/complete')
    completeSprint(@Param('id', ParseIntPipe) id: number) {
        return this.sprintService.completeSprint(id);
    }

    // -------------------- Issue Management --------------------

    @Post(':id/issues')
    addIssueToSprint(
        @Param('id', ParseIntPipe) id: number,
        @Body() addIssueDto: AddIssueToSprintDto,
    ) {
        return this.sprintService.addIssueToSprint(id, addIssueDto);
    }

    @Delete(':id/issues/:issueId')
    removeIssueFromSprint(
        @Param('id', ParseIntPipe) id: number,
        @Param('issueId', ParseIntPipe) issueId: number,
    ) {
        return this.sprintService.removeIssueFromSprint(id, issueId);
    }

    @Post('issues/move')
    moveIssueBetweenSprints(@Body() moveIssueDto: MoveIssueBetweenSprintsDto) {
        return this.sprintService.moveIssueBetweenSprints(moveIssueDto);
    }

    @Post('issues/bulk-move')
    bulkMoveIssues(@Body() bulkMoveDto: BulkMoveIssuesDto) {
        return this.sprintService.bulkMoveIssues(bulkMoveDto);
    }

    @Patch(':id/issues/reorder')
    reorderSprintIssues(
        @Param('id', ParseIntPipe) id: number,
        @Body() reorderDto: ReorderSprintIssuesDto,
    ) {
        return this.sprintService.reorderSprintIssues(id, reorderDto);
    }
}