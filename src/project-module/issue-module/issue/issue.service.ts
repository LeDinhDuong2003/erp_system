import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Employee } from 'src/database/entities/Employee.entity';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { IssueType, Epic, IssueComment, IssueLink, IssueChangeHistory } from '../../../database/entities/project-module/Issue.entity';
import { WorkflowStatus } from '../../../database/entities/project-module/Workflow.entity';
import { CreateIssueLinkDto } from './dto/create-issue-link.dto';
import { Project } from 'src/database/entities/project-module/Project.entity';
import { IssueHistoryService } from './issue-history.service';

@Injectable()
export class IssueService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(IssueType)
    private readonly issueTypeRepository: Repository<IssueType>,

    @InjectRepository(Epic)
    private readonly epicRepository: Repository<Epic>,

    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,

    @InjectRepository(IssueComment)
    private readonly issueCommentRepository: Repository<IssueComment>,

    @InjectRepository(IssueLink)
    private readonly issueLinkRepository: Repository<IssueLink>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(IssueChangeHistory)
    private readonly issueChangeHistoryRepository: Repository<IssueChangeHistory>,

    private readonly historyService: IssueHistoryService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate issue code based on project key and issue count
   * Format: {PROJECT_KEY}-{NUMBER}
   * Example: SCRUM-1, SCRUM-2, etc.
   */
  private async generateIssueCode(projectId: number): Promise<string> {
    // Get project to retrieve project_key
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.project_key) {
      throw new BadRequestException(`Project with ID ${projectId} does not have a project_key`);
    }

    // Count existing issues in this project
    const issueCount = await this.issueRepository.count({
      where: { project_id: projectId },
    });

    // Generate issue code: PROJECT_KEY-{count + 1}
    const issueNumber = issueCount + 1;
    const issueCode = `${project.project_key}-${issueNumber}`;

    return issueCode;
  }

  async create(createIssueDto: CreateIssueDto, userId: number): Promise<Issue> {
    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: createIssueDto.project_id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${createIssueDto.project_id} not found`);
    }

    // Validate issue type exists
    const issueType = await this.issueTypeRepository.findOne({
      where: { id: createIssueDto.issue_type_id },
    });

    if (!issueType) {
      throw new NotFoundException(`Issue type with ID ${createIssueDto.issue_type_id} not found`);
    }

    // Validate status exists
    const status = await this.workflowStatusRepository.findOne({
      where: { id: createIssueDto.current_status_id },
    });

    if (!status) {
      throw new NotFoundException(`Status with ID ${createIssueDto.current_status_id} not found`);
    }

    // Validate reporter exists
    const reporter = await this.employeeRepository.findOne({
      where: { id: createIssueDto.reporter_id },
    });

    if (!reporter) {
      throw new NotFoundException(`Reporter with ID ${createIssueDto.reporter_id} not found`);
    }

    // Generate issue code
    const issueCode = await this.generateIssueCode(createIssueDto.project_id);

    // Create issue with generated code
    const newIssue = this.issueRepository.create({
      ...createIssueDto,
      issue_code: issueCode,
    });

    const savedIssue = await this.issueRepository.save(newIssue);

    // Ghi lại lịch sử tạo issue
    await this.historyService.logChange(
      savedIssue.id,
      userId,
      'issue_created',
      null,
      `Issue ${issueCode} created`,
    );

    return savedIssue;
  }

  async findAll(search?: string, projectId?: number): Promise<Issue[]> {
    const queryBuilder = this.issueRepository.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.issue_type', 'issue_type')
      .leftJoinAndSelect('issue.current_status', 'current_status')
      .leftJoinAndSelect('issue.reporter', 'reporter')
      .leftJoinAndSelect('issue.epic_link', 'epic_link')
      .leftJoinAndSelect('issue.assignees', 'assignees')
      .leftJoinAndSelect('issue.watchers', 'watchers');

    // Filter by project if provided
    if (projectId) {
      queryBuilder.andWhere('issue.project_id = :projectId', { projectId });
    }

    // Search by issue_code or summary
    if (search && search.trim()) {
      queryBuilder.andWhere(
        '(issue.issue_code ILIKE :search OR issue.summary ILIKE :search)',
        { search: `%${search.trim()}%` }
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: [
        'issue_type',
        'reporter',
        'epic_link',
        'assignees',
        'watchers',
        'project',
      ],
    });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }
    return issue;
  }

  async update(id: number, updateIssueDto: UpdateIssueDto, userId: number): Promise<Issue> {
    const issue = await this.findOne(id);
    
    const changes: Array<{ fieldName: string; oldValue: any; newValue: any }> = [];

    // Track changes for each field
    if (updateIssueDto.issue_type_id && updateIssueDto.issue_type_id !== issue.issue_type_id) {
      const issueType = await this.issueTypeRepository.findOne({
        where: { id: updateIssueDto.issue_type_id },
      });
      if (!issueType) {
        throw new NotFoundException(`Issue type with ID ${updateIssueDto.issue_type_id} not found`);
      }
      changes.push({
        fieldName: 'issue_type_id',
        oldValue: issue.issue_type_id,
        newValue: updateIssueDto.issue_type_id,
      });
    }

    if (updateIssueDto.current_status_id && updateIssueDto.current_status_id !== issue.current_status_id) {
      const status = await this.workflowStatusRepository.findOne({
        where: { id: updateIssueDto.current_status_id },
      });
      if (!status) {
        throw new NotFoundException(`Status with ID ${updateIssueDto.current_status_id} not found`);
      }
      changes.push({
        fieldName: 'current_status_id',
        oldValue: issue.current_status_id,
        newValue: updateIssueDto.current_status_id,
      });
    }

    if (updateIssueDto.epic_link_id !== undefined && updateIssueDto.epic_link_id !== issue.epic_link_id) {
      if (updateIssueDto.epic_link_id !== null) {
        const epic = await this.epicRepository.findOne({
          where: { id: updateIssueDto.epic_link_id },
        });
        if (!epic) {
          throw new NotFoundException(`Epic with ID ${updateIssueDto.epic_link_id} not found`);
        }
      }
      changes.push({
        fieldName: 'epic_link_id',
        oldValue: issue.epic_link_id,
        newValue: updateIssueDto.epic_link_id,
      });
    }

    if (updateIssueDto.reporter_id && updateIssueDto.reporter_id !== issue.reporter_id) {
      const reporter = await this.employeeRepository.findOne({
        where: { id: updateIssueDto.reporter_id },
      });
      if (!reporter) {
        throw new NotFoundException(`Employee with ID ${updateIssueDto.reporter_id} not found`);
      }
      changes.push({
        fieldName: 'reporter_id',
        oldValue: issue.reporter_id,
        newValue: updateIssueDto.reporter_id,
      });
    }

    if (updateIssueDto.summary && updateIssueDto.summary !== issue.summary) {
      changes.push({
        fieldName: 'summary',
        oldValue: issue.summary,
        newValue: updateIssueDto.summary,
      });
    }

    if (updateIssueDto.description !== undefined && updateIssueDto.description !== issue.description) {
      changes.push({
        fieldName: 'description',
        oldValue: issue.description,
        newValue: updateIssueDto.description,
      });
    }

    if (updateIssueDto.story_points !== undefined && updateIssueDto.story_points !== issue.story_points) {
      changes.push({
        fieldName: 'story_points',
        oldValue: issue.story_points,
        newValue: updateIssueDto.story_points,
      });
    }

    if (updateIssueDto.original_estimate_seconds !== undefined && updateIssueDto.original_estimate_seconds !== issue.original_estimate_seconds) {
      changes.push({
        fieldName: 'original_estimate_seconds',
        oldValue: issue.original_estimate_seconds,
        newValue: updateIssueDto.original_estimate_seconds,
      });
    }

    if (updateIssueDto.time_spent_seconds !== undefined && updateIssueDto.time_spent_seconds !== issue.time_spent_seconds) {
      changes.push({
        fieldName: 'time_spent_seconds',
        oldValue: issue.time_spent_seconds,
        newValue: updateIssueDto.time_spent_seconds,
      });
    }

    if (updateIssueDto.resolution !== undefined && updateIssueDto.resolution !== issue.resolution) {
      changes.push({
        fieldName: 'resolution',
        oldValue: issue.resolution,
        newValue: updateIssueDto.resolution,
      });
    }

    await this.issueRepository.update(id, updateIssueDto);

    // Log all changes
    if (changes.length > 0) {
      await this.historyService.logMultipleChanges(id, userId, changes);
    }

    return this.findOne(id);
  }

  /**
   * Xóa issue và tất cả các quan hệ liên quan
   * Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
   */
  async remove(id: number, userId: number): Promise<Issue> {
    const existingIssue = await this.issueRepository.findOne({ 
      where: { id },
      relations: ['assignees', 'watchers'],
    });
    
    if (!existingIssue) {
      throw new NotFoundException(`Issue with ID ${id} not found for deletion`);
    }

    // Sử dụng transaction để xóa tất cả quan hệ
    await this.dataSource.transaction(async (manager) => {
      // 1. Xóa tất cả assignees (junction table: issue_assignees)
      await manager
        .createQueryBuilder()
        .delete()
        .from('issue_assignees')
        .where('issue_id = :id', { id })
        .execute();

      // 2. Xóa tất cả watchers (junction table: issue_watchers)
      await manager
        .createQueryBuilder()
        .delete()
        .from('issue_watchers')
        .where('issue_id = :id', { id })
        .execute();

      // 3. Xóa tất cả comments
      await manager.delete(IssueComment, { issue_id: id });

      // 4. Xóa tất cả links (cả source và target)
      await manager.delete(IssueLink, { source_issue_id: id });
      await manager.delete(IssueLink, { target_issue_id: id });

      // 5. Xóa tất cả change history
      await manager.delete(IssueChangeHistory, { issue_id: id });

      // 6. Xóa khỏi sprint_issues (nếu có table này)
      try {
        await manager
          .createQueryBuilder()
          .delete()
          .from('sprint_issues')
          .where('issue_id = :id', { id })
          .execute();
      } catch (error) {
        // Ignore if table doesn't exist
        console.log('sprint_issues table may not exist, skipping...');
      }

      // 7. Cuối cùng, xóa issue
      await manager.delete(Issue, { id });
    });

    return existingIssue;
  }

  /**
   * Lấy thông tin chi tiết của issue để hiển thị trong dialog xác nhận xóa
   */
  async getIssueDeleteInfo(id: number): Promise<{
    issue: Issue;
    assigneesCount: number;
    watchersCount: number;
    commentsCount: number;
    linksCount: number;
    historyCount: number;
  }> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['assignees', 'watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    const commentsCount = await this.issueCommentRepository.count({
      where: { issue_id: id },
    });

    const outgoingLinksCount = await this.issueLinkRepository.count({
      where: { source_issue_id: id },
    });
    const incomingLinksCount = await this.issueLinkRepository.count({
      where: { target_issue_id: id },
    });

    const historyCount = await this.issueChangeHistoryRepository.count({
      where: { issue_id: id },
    });

    return {
      issue,
      assigneesCount: issue.assignees?.length || 0,
      watchersCount: issue.watchers?.length || 0,
      commentsCount,
      linksCount: outgoingLinksCount + incomingLinksCount,
      historyCount,
    };
  }

  // -------------------- Assignees --------------------

  async getAssignees(issueId: number): Promise<Employee[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return issue.assignees;
  }

  async assignEmployee(issueId: number, { employee_id }: AssignEmployeeDto, userId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = await this.employeeRepository.findOne({ where: { id: employee_id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    if (issue.assignees.some(a => a.id === employee_id)) {
      throw new BadRequestException(`Employee ID ${employee_id} is already assigned to issue ${issueId}`);
    }

    issue.assignees.push(employee);
    const savedIssue = await this.issueRepository.save(issue);

    // Ghi lại lịch sử
    await this.historyService.logChange(
      issueId,
      userId,
      'assignee_added',
      null,
      `Employee ${employee.first_name} ${employee.last_name} (ID: ${employee_id})`,
    );

    return savedIssue;
  }

  async removeAssignee(issueId: number, employeeId: number, userId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = issue.assignees.find(a => a.id === employeeId);
    issue.assignees = issue.assignees.filter(a => a.id !== employeeId);
    const savedIssue = await this.issueRepository.save(issue);

    // Ghi lại lịch sử
    if (employee) {
      await this.historyService.logChange(
        issueId,
        userId,
        'assignee_removed',
        `Employee ${employee.first_name} ${employee.last_name} (ID: ${employeeId})`,
        null,
      );
    }

    return savedIssue;
  }

  // -------------------- Watchers --------------------

  async getWatchers(issueId: number): Promise<Employee[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return issue.watchers;
  }

  async addWatcher(issueId: number, { employee_id }: AssignEmployeeDto, userId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = await this.employeeRepository.findOne({ where: { id: employee_id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    if (issue.watchers.some(w => w.id === employee_id)) {
      throw new BadRequestException(`Employee ID ${employee_id} is already watching issue ${issueId}`);
    }

    issue.watchers.push(employee);
    const savedIssue = await this.issueRepository.save(issue);

    // Ghi lại lịch sử
    await this.historyService.logChange(
      issueId,
      userId,
      'watcher_added',
      null,
      `Employee ${employee.first_name} ${employee.last_name} (ID: ${employee_id})`,
    );

    return savedIssue;
  }

  async removeWatcher(issueId: number, employeeId: number, userId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = issue.watchers.find(w => w.id === employeeId);
    issue.watchers = issue.watchers.filter(w => w.id !== employeeId);
    const savedIssue = await this.issueRepository.save(issue);

    // Ghi lại lịch sử
    if (employee) {
      await this.historyService.logChange(
        issueId,
        userId,
        'watcher_removed',
        `Employee ${employee.first_name} ${employee.last_name} (ID: ${employeeId})`,
        null,
      );
    }

    return savedIssue;
  }

  // -------------------- Comments --------------------

  async getComments(issueId: number): Promise<IssueComment[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return this.issueCommentRepository.find({
      where: { issue_id: issueId },
      relations: ['employee'],
      order: { created_at: 'ASC' },
    });
  }

  async createComment(issueId: number, createCommentDto: CreateCommentDto): Promise<IssueComment> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: createCommentDto.employee_id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${createCommentDto.employee_id} not found`);
    }

    const comment = this.issueCommentRepository.create({
      issue_id: issueId,
      employee_id: createCommentDto.employee_id,
      content: createCommentDto.content,
    });

    return this.issueCommentRepository.save(comment);
  }

  async updateComment(issueId: number, commentId: number, updateCommentDto: UpdateCommentDto): Promise<IssueComment> {
    const comment = await this.issueCommentRepository.findOne({
      where: { id: commentId, issue_id: issueId },
      relations: ['employee'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on issue ${issueId}`);
    }

    comment.content = updateCommentDto.content;
    return this.issueCommentRepository.save(comment);
  }

  async deleteComment(issueId: number, commentId: number): Promise<IssueComment> {
    const comment = await this.issueCommentRepository.findOne({
      where: { id: commentId, issue_id: issueId },
      relations: ['employee'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found on issue ${issueId}`);
    }

    await this.issueCommentRepository.delete(commentId);
    return comment;
  }

  // -------------------- Issue Links --------------------

  async getIssueLinks(issueId: number): Promise<any> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    // Get links where this issue is the source
    const outgoingLinks = await this.issueLinkRepository.find({
      where: { source_issue_id: issueId },
      relations: ['target_issue', 'target_issue.issue_type', 'target_issue.current_status'],
    });

    // Get links where this issue is the target
    const incomingLinks = await this.issueLinkRepository.find({
      where: { target_issue_id: issueId },
      relations: ['source_issue', 'source_issue.issue_type', 'source_issue.current_status'],
    });

    return {
      outgoing: outgoingLinks.map(link => ({
        id: link.id,
        link_type: link.link_type,
        issue: {
          id: link.target_issue.id,
          issue_code: link.target_issue.issue_code,
          summary: link.target_issue.summary,
          issue_type: link.target_issue.issue_type?.type_name,
          current_status_id: link.target_issue.current_status_id,
        },
      })),
      incoming: incomingLinks.map(link => ({
        id: link.id,
        link_type: link.link_type,
        issue: {
          id: link.source_issue.id,
          issue_code: link.source_issue.issue_code,
          summary: link.source_issue.summary,
          issue_type: link.source_issue.issue_type?.type_name,
          current_status_id: link.source_issue.current_status_id,
        },
      })),
    };
  }

  async createIssueLink(sourceIssueId: number, createIssueLinkDto: CreateIssueLinkDto, userId: number): Promise<IssueLink> {
    // Validate source issue exists
    const sourceIssue = await this.issueRepository.findOne({
      where: { id: sourceIssueId },
    });

    if (!sourceIssue) {
      throw new NotFoundException(`Source issue with ID ${sourceIssueId} not found`);
    }

    // Validate target issue exists
    const targetIssue = await this.issueRepository.findOne({
      where: { id: createIssueLinkDto.target_issue_id },
    });

    if (!targetIssue) {
      throw new NotFoundException(`Target issue with ID ${createIssueLinkDto.target_issue_id} not found`);
    }

    // Check if link already exists
    const existingLink = await this.issueLinkRepository.findOne({
      where: {
        source_issue_id: sourceIssueId,
        target_issue_id: createIssueLinkDto.target_issue_id,
        link_type: createIssueLinkDto.link_type,
      },
    });

    if (existingLink) {
      throw new BadRequestException('This link already exists');
    }

    // Prevent self-linking
    if (sourceIssueId === createIssueLinkDto.target_issue_id) {
      throw new BadRequestException('Cannot link an issue to itself');
    }

    const issueLink = this.issueLinkRepository.create({
      source_issue_id: sourceIssueId,
      target_issue_id: createIssueLinkDto.target_issue_id,
      link_type: createIssueLinkDto.link_type,
    });

    const savedLink = await this.issueLinkRepository.save(issueLink);

    // Ghi lại lịch sử
    await this.historyService.logChange(
      sourceIssueId,
      userId,
      'link_created',
      null,
      `${createIssueLinkDto.link_type} to ${targetIssue.issue_code}`,
    );

    return savedLink;
  }

  async deleteIssueLink(issueId: number, linkId: number, userId: number): Promise<IssueLink> {
    const link = await this.issueLinkRepository.findOne({
      where: { id: linkId },
      relations: ['source_issue', 'target_issue'],
    });

    if (!link) {
      throw new NotFoundException(`Issue link with ID ${linkId} not found`);
    }

    // Verify the link belongs to this issue (either as source or target)
    if (link.source_issue_id !== issueId && link.target_issue_id !== issueId) {
      throw new BadRequestException(`Link ${linkId} does not belong to issue ${issueId}`);
    }

    // Ghi lại lịch sử
    const relatedIssueCode = link.source_issue_id === issueId 
      ? link.target_issue.issue_code 
      : link.source_issue.issue_code;

    await this.historyService.logChange(
      issueId,
      userId,
      'link_deleted',
      `${link.link_type} to ${relatedIssueCode}`,
      null,
    );

    await this.issueLinkRepository.delete(linkId);
    return link;
  }

  // -------------------- Reference Data --------------------

  async getIssueTypes(): Promise<IssueType[]> {
    return this.issueTypeRepository.find();
  }

  async getProjectEpics(projectId: number): Promise<Epic[]> {
    return this.epicRepository.find({
      where: { project_id: projectId },
    });
  }

  async getWorkflowStatuses(workflowId: number): Promise<WorkflowStatus[]> {
    return this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
      order: { order_index: 'ASC' },
    });
  }

  async getProjectEmployees(projectId: number): Promise<Employee[]> {
    // This would need a proper relation through project members
    // For now, return all employees (you should filter by project membership)
    return this.employeeRepository.find();
  }

  async getIssueHistory(issueId: number): Promise<IssueChangeHistory[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return this.historyService.getIssueHistory(issueId);
  }
}