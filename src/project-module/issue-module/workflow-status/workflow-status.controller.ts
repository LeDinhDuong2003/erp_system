import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WorkflowStatusService } from './workflow-status.service';
import { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { ReorderWorkflowStatusesDto } from './dto/reorder-workflow-statuses.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from 'src/project-module/permission-system/project-permission.guard';
import { RequirePermission } from 'src/project-module/permission-system/require-permission.decorator';

@Controller('workflow-statuses')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class WorkflowStatusController {
  constructor(private readonly workflowStatusService: WorkflowStatusService) {}

  /**
   * POST /workflow-statuses
   * Tạo status mới cho workflow
   */
  @Post()
  @RequirePermission('administer_project')
  create(@Body() createDto: CreateWorkflowStatusDto) {
    return this.workflowStatusService.create(createDto);
  }

  /**
   * GET /workflow-statuses?workflowId=1
   * Lấy tất cả statuses của một workflow
   */
  @Get()
  @RequirePermission('browse_project')
  findAllByWorkflow(
    @Query('workflowId', ParseIntPipe) workflowId: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.findAllByWorkflow(workflowId);
  }

  /**
   * GET /workflow-statuses/statistics?workflowId=1
   * Lấy thống kê số lượng issues theo status
   */
  @Get('statistics')
  @RequirePermission('browse_project')
  getStatusStatistics(
    @Query('workflowId', ParseIntPipe) workflowId: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.getStatusStatistics(workflowId);
  }

  /**
   * GET /workflow-statuses/:id
   * Lấy chi tiết một status
   */
  @Get(':id')
  @RequirePermission('browse_project')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.findOne(id);
  }

  /**
   * PATCH /workflow-statuses/:id
   * Cập nhật status
   */
  @Patch(':id')
  @RequirePermission('administer_project')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWorkflowStatusDto,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.update(id, updateDto);
  }

  /**
   * DELETE /workflow-statuses/:id
   * Xóa status
   */
  @Delete(':id')
  @RequirePermission('administer_project')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.remove(id);
  }

  /**
   * PATCH /workflow-statuses/reorder?workflowId=1
   * Reorder statuses trong workflow
   */
  @Patch('reorder')
  @RequirePermission('administer_project')
  reorderStatuses(
    @Query('workflowId', ParseIntPipe) workflowId: number,
    @Body() reorderDto: ReorderWorkflowStatusesDto,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.workflowStatusService.reorderStatuses(workflowId, reorderDto);
  }
}