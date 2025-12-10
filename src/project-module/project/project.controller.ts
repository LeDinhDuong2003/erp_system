import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Patch, 
  Param, 
  Delete, 
  ParseIntPipe, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { SchemeListService } from './scheme-list.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly schemeListService: SchemeListService,
  ) {}

  /**
   * Create project - Creator sẽ được gán Admin role tự động
   */
  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    const creatorId = req.user.id;
    return this.projectService.create(createProjectDto, creatorId);
  }

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.remove(id);
  }

  // ==================== SCHEME LISTING APIs ====================

  /**
   * GET /projects/schemes/permission
   * Lấy danh sách tất cả Permission Schemes
   */
  @Get('schemes/permission')
  async getPermissionSchemes() {
    return this.schemeListService.getAllPermissionSchemes();
  }

  /**
   * GET /projects/schemes/notification
   * Lấy danh sách tất cả Notification Schemes
   */
  @Get('schemes/notification')
  async getNotificationSchemes() {
    return this.schemeListService.getAllNotificationSchemes();
  }

  /**
   * GET /projects/schemes/workflow
   * Lấy danh sách tất cả Workflow Schemes
   */
  @Get('schemes/workflow')
  async getWorkflowSchemes() {
    return this.schemeListService.getAllWorkflowSchemes();
  }

  /**
   * GET /projects/schemes/all
   * Lấy tất cả schemes cùng lúc (tiện cho form create project)
   */
  @Get('schemes/all')
  async getAllSchemes() {
    return this.schemeListService.getAllSchemes();
  }

  /**
   * GET /projects/schemes/default
   * Lấy các default schemes (cho quick create)
   */
  @Get('schemes/default')
  async getDefaultSchemes() {
    return this.schemeListService.getDefaultSchemes();
  }
}