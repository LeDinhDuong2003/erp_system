import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Sprint, SprintIssue } from '../../database/entities/project-module/Sprint.entity';
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

        @InjectRepository(SprintIssue)
        private readonly sprintIssueRepository: Repository<SprintIssue>,

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

    async findAll(projectId?: number): Promise<Sprint[]> {
        const queryBuilder = this.sprintRepository
            .createQueryBuilder('sprint')
            .leftJoinAndSelect('sprint.project', 'project')
            .leftJoin('sprint.sprint_issues', 'sprint_issues')
            .leftJoin('sprint_issues.issue', 'issue')
            .addSelect('COUNT(issue.id)', 'issue_count')
            .groupBy('sprint.id')
            .addGroupBy('project.id')
            .orderBy('sprint.start_date', 'DESC');

        if (projectId) {
            queryBuilder.where('sprint.project_id = :projectId', { projectId });
        }

        const sprints = await queryBuilder.getRawAndEntities();

        return sprints.entities.map((sprint, index) => ({
            ...sprint,
            issue_count: parseInt(sprints.raw[index].issue_count) || 0,
        })) as any;
    }

    async findOne(id: number): Promise<Sprint> {
        const sprint = await this.sprintRepository.findOne({
            where: { id },
            relations: ['project', 'sprint_issues', 'sprint_issues.issue', 'sprint_issues.issue.issue_type'],
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        return sprint;
    }

    async getSprintIssues(sprintId: number): Promise<any> {
        const sprint = await this.sprintRepository.findOne({
            where: { id: sprintId },
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
        }

        const sprintIssues = await this.sprintIssueRepository.find({
            where: { sprint_id: sprintId },
            relations: [
                'issue',
                'issue.issue_type',
                'issue.current_status',
                'issue.assignees',
                'issue.epic_link',
            ],
            order: { rank_order: 'ASC' },
        });

        return sprintIssues.map(si => ({
            ...si.issue,
            rank_order: si.rank_order,
        }));
    }

    async getBacklog(projectId: number): Promise<Issue[]> {
        // Get all issues in project that are NOT in any sprint
        const issuesInSprints = await this.sprintIssueRepository
            .createQueryBuilder('si')
            .select('si.issue_id')
            .getMany();

        const issueIdsInSprints = issuesInSprints.map(si => si.issue_id);

        const queryBuilder = this.issueRepository
            .createQueryBuilder('issue')
            .leftJoinAndSelect('issue.issue_type', 'issue_type')
            .leftJoinAndSelect('issue.current_status', 'current_status')
            .leftJoinAndSelect('issue.assignees', 'assignees')
            .leftJoinAndSelect('issue.epic_link', 'epic_link')
            .where('issue.project_id = :projectId', { projectId });

        if (issueIdsInSprints.length > 0) {
            queryBuilder.andWhere('issue.id NOT IN (:...issueIds)', {
                issueIds: issueIdsInSprints,
            });
        }

        queryBuilder.orderBy('issue.order_index', 'ASC');

        return await queryBuilder.getMany();
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
            relations: ['sprint_issues'],
        });

        if (!sprint) {
            throw new NotFoundException(`Sprint with ID ${id} not found`);
        }

        // Check if sprint has issues
        if (sprint.sprint_issues && sprint.sprint_issues.length > 0) {
            throw new BadRequestException(
                `Cannot delete sprint with ${sprint.sprint_issues.length} issue(s). Please move issues first.`,
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

    async addIssueToSprint(sprintId: number, addIssueDto: AddIssueToSprintDto): Promise<SprintIssue> {
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
        const existingSprintIssue = await this.sprintIssueRepository.findOne({
            where: { issue_id: addIssueDto.issue_id },
        });

        if (existingSprintIssue) {
            throw new BadRequestException(
                `Issue is already in sprint ${existingSprintIssue.sprint_id}`,
            );
        }

        // Get max rank_order and add 1
        const maxRank = await this.sprintIssueRepository
            .createQueryBuilder('si')
            .select('MAX(si.rank_order)', 'max')
            .where('si.sprint_id = :sprintId', { sprintId })
            .getRawOne();

        const rankOrder = addIssueDto.rank_order ?? (maxRank?.max ? maxRank.max + 1 : 1);

        const sprintIssue = this.sprintIssueRepository.create({
            sprint_id: sprintId,
            issue_id: addIssueDto.issue_id,
            rank_order: rankOrder,
        });

        return await this.sprintIssueRepository.save(sprintIssue);
    }

    async removeIssueFromSprint(sprintId: number, issueId: number): Promise<void> {
        const sprintIssue = await this.sprintIssueRepository.findOne({
            where: { sprint_id: sprintId, issue_id: issueId },
        });

        if (!sprintIssue) {
            throw new NotFoundException(
                `Issue ${issueId} not found in sprint ${sprintId}`,
            );
        }

        await this.sprintIssueRepository.delete({
            sprint_id: sprintId,
            issue_id: issueId,
        });
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

        // Remove from current sprint if exists
        await this.sprintIssueRepository.delete({ issue_id });

        // If target_sprint_id is 0, move to backlog (do nothing more)
        if (target_sprint_id === 0) {
            return { message: 'Issue moved to backlog', issue_id };
        }

        // Validate target sprint exists
        const targetSprint = await this.sprintRepository.findOne({
            where: { id: target_sprint_id },
        });
        if (!targetSprint) {
            throw new NotFoundException(`Sprint with ID ${target_sprint_id} not found`);
        }

        // Add to target sprint
        return await this.addIssueToSprint(target_sprint_id, {
            issue_id,
            rank_order,
        });
    }

    async bulkMoveIssues(bulkMoveDto: BulkMoveIssuesDto): Promise<any> {
        const { issue_ids, target_sprint_id } = bulkMoveDto;

        const results: Array<{ issue_id: number; success: boolean; error?: string }> = [];

        for (const issue_id of issue_ids) {
            try {
                const result = await this.moveIssueBetweenSprints({
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

        // Update rank_order for each issue
        for (let i = 0; i < ordered_issue_ids.length; i++) {
            await this.sprintIssueRepository.update(
                { sprint_id: sprintId, issue_id: ordered_issue_ids[i] },
                { rank_order: i + 1 },
            );
        }

        return {
            message: 'Issues reordered successfully',
            sprint_id: sprintId,
            count: ordered_issue_ids.length,
        };
    }
}