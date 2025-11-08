import { 
    Controller, Post, Body, Get, Patch, Param, Delete, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AssignEmployeeDto } from './dto/assign-employee.dto';

// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('issue')
// @UseGuards(JwtAuthGuard) 
export class IssueController {
    constructor(private readonly issueService: IssueService) {}

    @Post() // POST /issue
    create(@Body() createIssueDto: CreateIssueDto) {
        return this.issueService.create(createIssueDto);
    }

    @Get() // GET /issue
    findAll() {
        return this.issueService.findAll();
    }

    @Get(':id') // GET /issue/:id
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.findOne(id);
    }

    @Patch(':id') // PATCH /issue/:id
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateIssueDto: UpdateIssueDto,
    ) {
        return this.issueService.update(id, updateIssueDto);
    }

    @Delete(':id') // DELETE /issue/:id
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.remove(id);
    }


    // -------------------- Assignees Endpoints --------------------

    @Get(':id/assignees') // GET /issue/:id/assignees
    getAssignees(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getAssignees(id);
    }

    @Post(':id/assignees') // POST /issue/:id/assignees
    assignEmployee(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
    ) {
        return this.issueService.assignEmployee(id, assignEmployeeDto);
    }

    // -------------------- Watchers Endpoints --------------------

    @Get(':id/watchers') // GET /issue/:id/watchers
    getWatchers(@Param('id', ParseIntPipe) id: number) {
        return this.issueService.getWatchers(id);
    }

    @Post(':id/watchers') // POST /issue/:id/watchers
    addWatcher(
        @Param('id', ParseIntPipe) id: number,
        @Body() assignEmployeeDto: AssignEmployeeDto,
    ) {
        return this.issueService.addWatcher(id, assignEmployeeDto);
    }
}