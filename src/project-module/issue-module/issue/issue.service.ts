import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Employee } from 'src/database/entities/Employee.entity';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { IssueType, Epic, IssueComment, IssueLink } from '../../../database/entities/project-module/Issue.entity';
import { WorkflowStatus } from '../../../database/entities/project-module/Workflow.entity';
import { CreateIssueLinkDto } from './dto/create-issue-link.dto';
import { Project } from 'src/database/entities/project-module/Project.entity';

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

  async create(createIssueDto: CreateIssueDto): Promise<Issue> {
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

    return await this.issueRepository.save(newIssue);
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
        // 'current_status',
        // 'current_status.workflow',
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

  async update(id: number, updateIssueDto: UpdateIssueDto): Promise<Issue> {
    const issue = await this.findOne(id);
    
    // Validate related entities if they are being updated
    if (updateIssueDto.issue_type_id) {
      const issueType = await this.issueTypeRepository.findOne({
        where: { id: updateIssueDto.issue_type_id },
      });
      if (!issueType) {
        throw new NotFoundException(`Issue type with ID ${updateIssueDto.issue_type_id} not found`);
      }
    }

    if (updateIssueDto.current_status_id) {
      const status = await this.workflowStatusRepository.findOne({
        where: { id: updateIssueDto.current_status_id },
      });
      if (!status) {
        throw new NotFoundException(`Status with ID ${updateIssueDto.current_status_id} not found`);
      }
    }

    if (updateIssueDto.epic_link_id) {
      const epic = await this.epicRepository.findOne({
        where: { id: updateIssueDto.epic_link_id },
      });
      if (!epic) {
        throw new NotFoundException(`Epic with ID ${updateIssueDto.epic_link_id} not found`);
      }
    }

    if (updateIssueDto.reporter_id) {
      const reporter = await this.employeeRepository.findOne({
        where: { id: updateIssueDto.reporter_id },
      });
      if (!reporter) {
        throw new NotFoundException(`Employee with ID ${updateIssueDto.reporter_id} not found`);
      }
    }

    await this.issueRepository.update(id, updateIssueDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Issue> {
    const existingIssue = await this.issueRepository.findOne({ where: { id } });
    if (!existingIssue) {
      throw new NotFoundException(`Issue with ID ${id} not found for deletion`);
    }
    await this.issueRepository.delete(id);
    return existingIssue;
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

  async assignEmployee(issueId: number, { employee_id }: AssignEmployeeDto): Promise<Issue> {
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
    return this.issueRepository.save(issue);
  }

  async removeAssignee(issueId: number, employeeId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    issue.assignees = issue.assignees.filter(a => a.id !== employeeId);
    return this.issueRepository.save(issue);
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

  async addWatcher(issueId: number, { employee_id }: AssignEmployeeDto): Promise<Issue> {
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
    return this.issueRepository.save(issue);
  }

  async removeWatcher(issueId: number, employeeId: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    issue.watchers = issue.watchers.filter(w => w.id !== employeeId);
    return this.issueRepository.save(issue);
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

  async createIssueLink(sourceIssueId: number, createIssueLinkDto: CreateIssueLinkDto): Promise<IssueLink> {
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

    return this.issueLinkRepository.save(issueLink);
  }

  async deleteIssueLink(issueId: number, linkId: number): Promise<IssueLink> {
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
}