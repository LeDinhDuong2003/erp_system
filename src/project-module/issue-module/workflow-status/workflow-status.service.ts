import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkflowStatus, Workflow } from '../../../database/entities/project-module/Workflow.entity';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { ReorderWorkflowStatusesDto } from './dto/reorder-workflow-statuses.dto';

@Injectable()
export class WorkflowStatusService {
  constructor(
    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,

    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,

    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,

    private readonly dataSource: DataSource,
  ) {}

  // ==================== CRUD Operations ====================

  /**
   * Tạo status mới cho workflow
   */
  async create(createDto: CreateWorkflowStatusDto): Promise<WorkflowStatus> {
    // Validate workflow exists
    const workflow = await this.workflowRepository.findOne({
      where: { id: createDto.workflow_id },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${createDto.workflow_id} not found`);
    }

    // Check if status name already exists in this workflow
    const existingStatus = await this.workflowStatusRepository.findOne({
      where: {
        workflow_id: createDto.workflow_id,
        status_name: createDto.status_name,
      },
    });

    if (existingStatus) {
      throw new BadRequestException(
        `Status "${createDto.status_name}" already exists in this workflow`
      );
    }

    // If order_index not provided, set to max + 1
    let orderIndex = createDto.order_index;
    if (orderIndex === undefined) {
      const maxOrder = await this.workflowStatusRepository
        .createQueryBuilder('status')
        .select('MAX(status.order_index)', 'max')
        .where('status.workflow_id = :workflowId', { workflowId: createDto.workflow_id })
        .getRawOne();

      orderIndex = maxOrder?.max !== null ? maxOrder.max + 1 : 0;
    }

    // If this is set as initial status, unset other initial statuses
    if (createDto.is_initial_status) {
      await this.workflowStatusRepository.update(
        { workflow_id: createDto.workflow_id, is_initial_status: true },
        { is_initial_status: false }
      );
    }

    const status = this.workflowStatusRepository.create({
      ...createDto,
      order_index: orderIndex,
    });

    return await this.workflowStatusRepository.save(status);
  }

  /**
   * Lấy tất cả statuses của một workflow
   */
  async findAllByWorkflow(workflowId: number): Promise<WorkflowStatus[]> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    return await this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
      order: { order_index: 'ASC' },
    });
  }

  /**
   * Lấy chi tiết một status
   */
  async findOne(id: number): Promise<WorkflowStatus> {
    const status = await this.workflowStatusRepository.findOne({
      where: { id },
      relations: ['workflow'],
    });

    if (!status) {
      throw new NotFoundException(`Workflow status with ID ${id} not found`);
    }

    return status;
  }

  /**
   * Cập nhật status
   */
  async update(id: number, updateDto: UpdateWorkflowStatusDto): Promise<WorkflowStatus> {
    const status = await this.workflowStatusRepository.findOne({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException(`Workflow status with ID ${id} not found`);
    }

    // If updating status name, check for duplicates
    if (updateDto.status_name && updateDto.status_name !== status.status_name) {
      const existingStatus = await this.workflowStatusRepository.findOne({
        where: {
          workflow_id: status.workflow_id,
          status_name: updateDto.status_name,
        },
      });

      if (existingStatus) {
        throw new BadRequestException(
          `Status "${updateDto.status_name}" already exists in this workflow`
        );
      }
    }

    // If setting as initial status, unset others
    if (updateDto.is_initial_status) {
      await this.workflowStatusRepository.update(
        { workflow_id: status.workflow_id, is_initial_status: true },
        { is_initial_status: false }
      );
    }

    await this.workflowStatusRepository.update(id, updateDto);
    return this.findOne(id);
  }

  /**
   * Xóa status
   */
  async remove(id: number): Promise<{ message: string }> {
    const status = await this.workflowStatusRepository.findOne({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException(`Workflow status with ID ${id} not found`);
    }

    // Check if there are issues using this status
    const issueCount = await this.issueRepository.count({
      where: { current_status_id: id },
    });

    if (issueCount > 0) {
      throw new BadRequestException(
        `Cannot delete status. ${issueCount} issue(s) are currently using this status.`
      );
    }

    // Check if this is the only status in the workflow
    const statusCount = await this.workflowStatusRepository.count({
      where: { workflow_id: status.workflow_id },
    });

    if (statusCount === 1) {
      throw new BadRequestException(
        'Cannot delete the only status in a workflow. Workflow must have at least one status.'
      );
    }

    await this.workflowStatusRepository.delete(id);

    // Reorder remaining statuses
    const remainingStatuses = await this.workflowStatusRepository.find({
      where: { workflow_id: status.workflow_id },
      order: { order_index: 'ASC' },
    });

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < remainingStatuses.length; i++) {
        await manager.update(
          WorkflowStatus,
          { id: remainingStatuses[i].id },
          { order_index: i }
        );
      }
    });

    return { message: 'Workflow status deleted successfully' };
  }

  /**
   * Reorder statuses trong workflow
   */
  async reorderStatuses(
    workflowId: number,
    reorderDto: ReorderWorkflowStatusesDto
  ): Promise<{ message: string }> {
    const { orderedStatusIds } = reorderDto;

    // Validate workflow exists
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    // Get all statuses in workflow
    const statuses = await this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
    });

    const statusIds = statuses.map(s => s.id);
    const invalidIds = orderedStatusIds.filter(id => !statusIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid status IDs: ${invalidIds.join(', ')} do not belong to workflow ${workflowId}`
      );
    }

    if (orderedStatusIds.length !== statuses.length) {
      throw new BadRequestException(
        `Expected ${statuses.length} status IDs but got ${orderedStatusIds.length}`
      );
    }

    // Update order_index
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < orderedStatusIds.length; i++) {
        await manager.update(
          WorkflowStatus,
          { id: orderedStatusIds[i] },
          { order_index: i }
        );
      }
    });

    return { message: 'Statuses reordered successfully' };
  }

  /**
   * Lấy thống kê số lượng issues theo status
   */
  async getStatusStatistics(workflowId: number): Promise<any[]> {
    const statuses = await this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
      order: { order_index: 'ASC' },
    });

    const statistics = await Promise.all(
      statuses.map(async (status) => {
        const issueCount = await this.issueRepository.count({
          where: { current_status_id: status.id },
        });

        return {
          status_id: status.id,
          status_name: status.status_name,
          status_category: status.status_category,
          is_initial_status: status.is_initial_status,
          order_index: status.order_index,
          issue_count: issueCount,
        };
      })
    );

    return statistics;
  }
}