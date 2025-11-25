import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueType } from '../../entities/project-module/Issue.entity'; // Đã có sẵn

// Import các Entities mới
import {
  Workflow,
  WorkflowScheme,
  WorkflowStatus,
  WorkflowSchemeMapping,
} from '../../entities/project-module/Workflow.entity'; // Giả định các Entity mới nằm trong file này

@Injectable()
export class WorkflowSeederService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowSeederService.name);

  // Danh sách các loại Issue mặc định (giữ nguyên)
  private readonly defaultIssueTypes = [
    'bug',
    'feature',
    'request',
    'story',
    'task',
  ];

  // 1. Danh sách các Status mặc định
  private readonly defaultStatuses = [
    {
      status_name: 'To Do',
      status_category: 'New',
      is_initial_status: true,
      order_index: 0,
    },
    {
      status_name: 'In Progress',
      status_category: 'In Progress',
      is_initial_status: false,
      order_index: 1,
    },
    {
      status_name: 'Done',
      status_category: 'Done',
      is_initial_status: false,
      order_index: 2,
    },
  ];

  // 2. Tên Workflow và Scheme mặc định
  private readonly defaultWorkflowName = 'Simple Workflow';
  private readonly defaultSchemeName = 'Default Scheme';

  constructor(
    @InjectRepository(IssueType)
    private readonly issueTypeRepository: Repository<IssueType>,
    // Thêm Repositories cho Workflow
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,
    @InjectRepository(WorkflowScheme)
    private readonly workflowSchemeRepository: Repository<WorkflowScheme>,
    @InjectRepository(WorkflowSchemeMapping)
    private readonly workflowMappingRepository: Repository<WorkflowSchemeMapping>,
  ) {}

  /**
   * Chạy seeder ngay khi module được khởi tạo.
   */
  async onModuleInit() {
    await this.seedIssueTypes();
    await this.seedWorkflowSetup();
  }

  /**
   * Kiểm tra và tạo các loại issue mặc định nếu bảng chưa có dữ liệu. (Giữ nguyên)
   */
  async seedIssueTypes() {
    try {
      const count = await this.issueTypeRepository.count();

      if (count > 0) {
        this.logger.log('Issue types already exist. Skipping seed.');
        return;
      }

      const entities = this.defaultIssueTypes.map((typeName) =>
        this.issueTypeRepository.create({ type_name: typeName }),
      );

      await this.issueTypeRepository.save(entities);

      this.logger.log(
        `✅ Successfully seeded ${entities.length} default issue types.`,
      );
    } catch (error) {
      this.logger.error('Error seeding issue types:', error);
    }
  }

  // -------------------- PHẦN SEEDING MỚI --------------------

  async seedWorkflowSetup() {
    this.logger.log('Starting workflow setup seed...');
    try {
      // B1: Kiểm tra và tạo Workflow
      const defaultWorkflow = await this.seedDefaultWorkflow();
      if (!defaultWorkflow) return;

      // B2: Kiểm tra và tạo Workflow Statuses
      const seededStatuses = await this.seedDefaultStatuses(
        defaultWorkflow.id,
      );

      // B3: Kiểm tra và tạo Workflow Scheme
      const defaultScheme = await this.seedDefaultScheme();
      if (!defaultScheme) return;

      // B4: Lấy tất cả IssueType ID và tạo Mapping
      await this.seedWorkflowMapping(defaultScheme.id, defaultWorkflow.id);
      
    } catch (error) {
      this.logger.error('Error in seedWorkflowSetup:', error);
    }
  }

  /**
   * Tạo Workflow cơ bản nếu chưa có.
   */
  private async seedDefaultWorkflow(): Promise<Workflow | null> {
    const existingWorkflow = await this.workflowRepository.findOne({
      where: { workflow_name: this.defaultWorkflowName },
    });

    if (existingWorkflow) {
      this.logger.log(`Workflow "${this.defaultWorkflowName}" already exists.`);
      return existingWorkflow;
    }

    const newWorkflow = this.workflowRepository.create({
      workflow_name: this.defaultWorkflowName,
      is_active: true,
    });

    const savedWorkflow = await this.workflowRepository.save(newWorkflow);
    this.logger.log(`✅ Created default Workflow: ${savedWorkflow.workflow_name}`);
    return savedWorkflow;
  }

  /**
   * Tạo Workflow Statuses cho Workflow đã tạo.
   */
  private async seedDefaultStatuses(
    workflowId: number,
  ): Promise<WorkflowStatus[]> {
    // Chỉ kiểm tra một status để quyết định có seed hay không
    const firstStatusName = this.defaultStatuses[0].status_name;
    const existingStatus = await this.workflowStatusRepository.findOne({
      where: { workflow_id: workflowId, status_name: firstStatusName },
    });

    if (existingStatus) {
      this.logger.log(`Workflow statuses for workflow ID ${workflowId} already exist. Skipping status seed.`);
      return await this.workflowStatusRepository.find({
        where: { workflow_id: workflowId },
      });
    }

    const statuses = this.defaultStatuses.map((status) =>
      this.workflowStatusRepository.create({
        ...status,
        workflow_id: workflowId,
      }),
    );

    const savedStatuses = await this.workflowStatusRepository.save(statuses);
    this.logger.log(`✅ Seeded ${savedStatuses.length} default Workflow Statuses.`);
    return savedStatuses;
  }

  /**
   * Tạo Workflow Scheme cơ bản nếu chưa có.
   */
  private async seedDefaultScheme(): Promise<WorkflowScheme | null> {
    const existingScheme = await this.workflowSchemeRepository.findOne({
      where: { scheme_name: this.defaultSchemeName },
    });

    if (existingScheme) {
      this.logger.log(`Workflow Scheme "${this.defaultSchemeName}" already exists.`);
      return existingScheme;
    }

    const newScheme = this.workflowSchemeRepository.create({
      scheme_name: this.defaultSchemeName,
      scheme_description: 'Default scheme for all issue types.',
    });

    const savedScheme = await this.workflowSchemeRepository.save(newScheme);
    this.logger.log(`✅ Created default Workflow Scheme: ${savedScheme.scheme_name}`);
    return savedScheme;
  }

  /**
   * Tạo Workflow Mapping: Gán Workflow cơ bản cho TẤT CẢ IssueType trong Scheme cơ bản.
   */
  private async seedWorkflowMapping(
    schemeId: number,
    workflowId: number,
  ): Promise<void> {
    // Lấy tất cả IssueType (đảm bảo đã được seed ở bước trước)
    const issueTypes = await this.issueTypeRepository.find();
    
    // Kiểm tra xem mapping đã tồn tại cho Scheme/IssueType đầu tiên chưa
    if (issueTypes.length === 0) {
        this.logger.warn('No Issue Types found to create mappings.');
        return;
    }
    
    const existingMapping = await this.workflowMappingRepository.findOne({
      where: { workflow_scheme_id: schemeId, issue_type_id: issueTypes[0].id },
    });

    if (existingMapping) {
      this.logger.log(`Workflow mappings for Scheme ID ${schemeId} already exist. Skipping mapping seed.`);
      return;
    }

    // Tạo Mapping cho mỗi IssueType
    const mappings = issueTypes.map((issueType) =>
      this.workflowMappingRepository.create({
        workflow_scheme_id: schemeId,
        issue_type_id: issueType.id,
        workflow_id: workflowId,
      }),
    );

    await this.workflowMappingRepository.save(mappings);

    this.logger.log(`✅ Successfully seeded ${mappings.length} Workflow Scheme Mappings.`);
  }
}