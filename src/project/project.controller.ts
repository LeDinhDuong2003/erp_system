import { Controller, Post, Body, Get, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post() // POST /project
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get() // GET /project
  async findAll() {
    return this.projectService.findAll();
  }

  @Get(':id') // GET /project/:id
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.findOne(id);
  }

  @Patch(':id') // PATCH /project/:id
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id') // DELETE /project/:id
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.remove(id);
  }
}