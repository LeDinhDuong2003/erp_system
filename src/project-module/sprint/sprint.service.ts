import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Sprint } from '../../database/entities/project-module/Sprint.entity';
import { Issue } from '../../database/entities/project-module/Issue.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import {
    ChangeSprintStatusDto,
    AddIssueToSprintDto,
    MoveIssueBetweenSprintsDto,
    BulkMoveIssuesDto,
    ReorderSprintIssuesDto,
} from './dto/sprint-operation.dto';

@Injectable()
export class SprintService {
    constructor(
        @InjectRepository(Sprint)
        private readonly sprintRepository: Repository<Sprint>,

        @InjectRepository(Issue)
        private readonly issueRepository: Repository<Issue>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
    ) {}

    // -------------------- CRUD Operations --------------------

    async create(createSprintDto: CreateSprintDto): Promise<Sprint> {
        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: createSprintDto.project_id },
        });

        if (!project) {
            throw new NotFoundException(
                `Project with ID ${createSprintDto.project_id} not found`,
            );
        }

        // Default status to 'planning'
        const sprintData = {
            ...createSprintDto,
            status: createSprintDto.status || 'planning',
        };

        const sprint = this.sprintRepository.create(sprintData);
        return await this.sprintRepository.save(sprint);
    }

    async findAll(projectId?: number): Promise<any[]> {
        const whereClause: any = {};
        
        if (projectId) {
            whereClause.project_id = projectId;
        }
    
        const sprints = await this.sprintRepository.find({
            where: whereClause,
            relations: ['project'],
            order: { 
                start_date: 'DESC',
            },
        });
    
        // Đếm issues và format dates
        const result = await Promise.all(
            sprints.map(async (sprint) => {
                const issue_count = await this.issueRepository.count({
                    where: { sprint_id: sprint.id },
                });
                
                // Parse dates manually
                const start_date = sprint.start_date 
                    ? new Date(sprint.start_date).toISOString() 
                    : null;
                const end_date = sprint.end_date 
                    ? new Date(sprint.end_date).toISOString() 
                    : null;
                
                return {
                    id: sprint.id,
                    project_id: sprint.project_id,
                    sprint_name: sprint.sprint_name,
                    goal: sprint.goal,
                    start_date,
                    end_date,
                    duration_days: sprint.duration_days,
                    status: sprint.status,
                    project: sprint.project,
                    issue_count,
                };
            })
        );
    
        return result;
    }

    async findOne(id: number): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({
            where: { id },
            relations: ['project', 'issues', 'issues.issue_type'],
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        return sprint;
    }

    async getSprintIssues(sprintId: number): Promise<Issue[]> {
        const sprint = await this.sprintRepository.findOne({
            where: { id: sprintId },
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
        }

        const issues = await this.issueRepository.find({
            where: { sprint_id: sprintId },
            relations: [
                'issue_type',
                'current_status',
                'assignees',
                'epic_link',
            ],
            order: { order_index: 'ASC' },
        });

        return issues;
    }

    async getBacklog(projectId: number): Promise<Issue[]> {
        // Get all issues in project that are NOT in any sprint (sprint_id is null)
        const issues = await this.issueRepository.find({
            where: { 
                project_id: projectId,
                sprint_id: IsNull(),
            },
            relations: [
                'issue_type',
                'current_status',
                'assignees',
                'epic_link',
            ],
            order: { order_index: 'ASC' },
        });

        return issues;
    }

    async update(id: number, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({ where: { id } });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        // Validate project if being updated
        if (updateSprintDto.project_id) {
            const project = await this.projectRepository.findOne({
                where: { id: updateSprintDto.project_id },
            });

            if (!project) {
                throw new NotFoundException(
                    `Project with ID ${updateSprintDto.project_id} not found`,
                );
            }
        }

        await this.sprintRepository.update(id, updateSprintDto);
        return this.findOne(id);
    }

    async remove(id: number): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({
            where: { id },
            relations: ['issues'],
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        // Check if sprint has issues
        if (sprint.issues && sprint.issues.length > 0) {
            throw new BadRequestException(
                `Cannot delete sprint with ${sprint.issues.length} issue(s). Please move issues first.`,
            );
        }

        await this.sprintRepository.delete(id);
        return sprint;
    }

    // -------------------- Sprint Status Management --------------------

    async changeStatus(id: number, changeStatusDto: ChangeSprintStatusDto): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({ where: { id } });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        sprint.status = changeStatusDto.status;
        return await this.sprintRepository.save(sprint);
    }

    async startSprint(id: number): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({ where: { id } });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        if (sprint.status === 'active') {
            throw new BadRequestException('Sprint is already active');
        }

        // Check if there's another active sprint in the same project
        const activeSprint = await this.sprintRepository.findOne({
            where: {
                project_id: sprint.project_id,
                status: 'active',
            },
        });

        if (activeSprint) {
            throw new BadRequestException(
                `Cannot start sprint. Sprint "${activeSprint.sprint_name}" is already active.`,
            );
        }

        sprint.status = 'active';
        if (!sprint.start_date) {
            sprint.start_date = new Date();
        }

        return await this.sprintRepository.save(sprint);
    }

    async completeSprint(id: number): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({ where: { id } });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        if (sprint.status !== 'active') {
            throw new BadRequestException('Only active sprints can be completed');
        }

        sprint.status = 'completed';
        if (!sprint.end_date) {
            sprint.end_date = new Date();
        }

        return await this.sprintRepository.save(sprint);
    }

    // -------------------- Issue Management --------------------

    async addIssueToSprint(sprintId: number, addIssueDto: AddIssueToSprintDto): Promise<Issue> {
        const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
        }

        const issue = await this.issueRepository.findOne({
            where: { id: addIssueDto.issue_id },
        });
        if (!issue) {
            throw new NotFoundException(`Issue with ID ${addIssueDto.issue_id} not found`);
        }

        // Check if issue is already in a sprint
        if (issue.sprint_id && issue.sprint_id !== sprintId) {
            throw new BadRequestException(
                `Issue is already in sprint ${issue.sprint_id}`,
            );
        }

        // Update issue's sprint_id
        issue.sprint_id = sprintId;

        // Update order_index if provided
        if (addIssueDto.rank_order !== undefined) {
            issue.order_index = addIssueDto.rank_order;
        } else {
            // Get max order_index in the sprint and add 1
            const maxOrderIssue = await this.issueRepository
                .createQueryBuilder('issue')
                .select('MAX(issue.order_index)', 'max')
                .where('issue.sprint_id = :sprintId', { sprintId })
                .getRawOne();

            issue.order_index = maxOrderIssue?.max ? maxOrderIssue.max + 1 : 1;
        }

        return await this.issueRepository.save(issue);
    }

    async removeIssueFromSprint(sprintId: number, issueId: number): Promise<void> {
        const issue = await this.issueRepository.findOne({
            where: { id: issueId, sprint_id: sprintId },
        });

        if (!issue) {
            throw new NotFoundException(
                `Issue ${issueId} not found in sprint ${sprintId}`,
            );
        }

        // Set sprint_id to null to move back to backlog
        issue.sprint_id = null;
        await this.issueRepository.save(issue);
    }

    async moveIssueBetweenSprints(moveIssueDto: MoveIssueBetweenSprintsDto): Promise<any> {
        const { issue_id, target_sprint_id, rank_order } = moveIssueDto;

        // Validate issue exists
        const issue = await this.issueRepository.findOne({
            where: { id: issue_id },
        });
        if (!issue) {
            throw new NotFoundException(`Issue with ID ${issue_id} not found`);
        }

        // If target_sprint_id is 0 or null, move to backlog
        if (!target_sprint_id || target_sprint_id === 0) {
            issue.sprint_id = null;
            await this.issueRepository.save(issue);
            return { message: 'Issue moved to backlog', issue_id };
        }

        // Validate target sprint exists
        const targetSprint = await this.sprintRepository.findOne({
            where: { id: target_sprint_id },
        });
        if (!targetSprint) {
            throw new NotFoundException(`Sprint with ID ${target_sprint_id} not found`);
        }

        // Update issue's sprint_id
        issue.sprint_id = target_sprint_id;

        // Update order_index if provided
        if (rank_order !== undefined) {
            issue.order_index = rank_order;
        } else {
            // Get max order_index in the target sprint and add 1
            const maxOrderIssue = await this.issueRepository
                .createQueryBuilder('issue')
                .select('MAX(issue.order_index)', 'max')
                .where('issue.sprint_id = :sprintId', { sprintId: target_sprint_id })
                .getRawOne();

            issue.order_index = maxOrderIssue?.max ? maxOrderIssue.max + 1 : 1;
        }

        await this.issueRepository.save(issue);

        return { 
            message: 'Issue moved successfully', 
            issue_id,
            target_sprint_id 
        };
    }

    async bulkMoveIssues(bulkMoveDto: BulkMoveIssuesDto): Promise<any> {
        const { issue_ids, target_sprint_id } = bulkMoveDto;

        const results: Array<{ issue_id: number; success: boolean; error?: string }> = [];

        for (const issue_id of issue_ids) {
            try {
                await this.moveIssueBetweenSprints({
                    issue_id,
                    target_sprint_id,
                });
                results.push({ issue_id, success: true });
            } catch (error: any) {
                results.push({ issue_id, success: false, error: error.message });
            }
        }

        return {
            message: `Moved ${results.filter(r => r.success).length} of ${issue_ids.length} issues`,
            results,
        };
    }

    async reorderSprintIssues(sprintId: number, reorderDto: ReorderSprintIssuesDto): Promise<any> {
        const { ordered_issue_ids } = reorderDto;

        // Update order_index for each issue
        for (let i = 0; i < ordered_issue_ids.length; i++) {
            await this.issueRepository.update(
                { id: ordered_issue_ids[i], sprint_id: sprintId },
                { order_index: i + 1 },
            );
        }

        return {
            message: 'Issues reordered successfully',
            sprint_id: sprintId,
            count: ordered_issue_ids.length,
        };
    }
}