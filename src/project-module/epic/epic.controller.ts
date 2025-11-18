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
} from '@nestjs/common';
import { EpicService } from './epic.service';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Controller('epics')
export class EpicController {
    constructor(private readonly epicService: EpicService) {}

    @Post()
    create(@Body() createEpicDto: CreateEpicDto) {
        return this.epicService.create(createEpicDto);
    }

    @Get()
    findAll(@Query('projectId', ParseIntPipe) projectId?: number) {
        return this.epicService.findAll(projectId);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.epicService.findOne(id);
    }

    @Get(':id/issues')
    getEpicIssues(@Param('id', ParseIntPipe) id: number) {
        return this.epicService.getEpicIssues(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateEpicDto: UpdateEpicDto,
    ) {
        return this.epicService.update(id, updateEpicDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.epicService.remove(id);
    }
}