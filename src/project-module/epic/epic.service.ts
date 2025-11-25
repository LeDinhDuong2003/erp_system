import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Epic } from '../../database/entities/project-module/Issue.entity';
import { Issue } from '../../database/entities/project-module/Issue.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';

@Injectable()
export class EpicService {
    constructor(
        @InjectRepository(Epic)
        private readonly epicRepository: Repository<Epic>,

        @InjectRepository(Issue)
        private readonly issueRepository: Repository<Issue>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
    ) {}

    async create(createEpicDto: CreateEpicDto): Promise<Epic> {
        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: createEpicDto.project_id },
        });

        if (!project) {
            throw new NotFoundException(
                `Project with ID ${createEpicDto.project_id} not found`,
            );
        }

        // Validate dates if provided
        if (
            createEpicDto.start_date &&
            createEpicDto.due_date &&
            new Date(createEpicDto.start_date) > new Date(createEpicDto.due_date)
        ) {
            throw new BadRequestException('Start date cannot be after due date');
        }

        const epic = this.epicRepository.create(createEpicDto);
        return await this.epicRepository.save(epic);
    }

    async findAll(projectId?: number): Promise<Epic[]> {
        const queryBuilder = this.epicRepository
            .createQueryBuilder('epic')
            .leftJoinAndSelect('epic.project', 'project')
            .leftJoin('epic.issues', 'issues')
            .addSelect('COUNT(issues.id)', 'issue_count')
            .groupBy('epic.id')
            .addGroupBy('project.id')
            // .orderBy('epic.created_at', 'DESC');

        if (projectId) {
            queryBuilder.where('epic.project_id = :projectId', { projectId });
        }

        const epics = await queryBuilder.getRawAndEntities();

        // Manually attach issue count to each epic
        return epics.entities.map((epic, index) => ({
            ...epic,
            issue_count: parseInt(epics.raw[index].issue_count) || 0,
        })) as any;
    }

    async findOne(id: number): Promise<Epic> {
        const epic = await this.epicRepository.findOne({
            where: { id },
            relations: ['project', 'issues', 'issues.issue_type', 'issues.current_status'],
        });

        if (!epic) {
            throw new NotFoundException(`Epic with ID ${id} not found`);
        }

        return epic;
    }

    async getEpicIssues(id: number): Promise<Issue[]> {
        const epic = await this.epicRepository.findOne({
            where: { id },
            relations: [
                'issues',
                'issues.issue_type',
                'issues.current_status',
                'issues.reporter',
                'issues.assignees',
            ],
        });

        if (!epic) {
            throw new NotFoundException(`Epic with ID ${id} not found`);
        }

        return epic.issues;
    }

    async update(id: number, updateEpicDto: UpdateEpicDto): Promise<Epic> {
        const epic = await this.epicRepository.findOne({ where: { id } });

        if (!epic) {
            throw new NotFoundException(`Epic with ID ${id} not found`);
        }

        // Validate project if being updated
        if (updateEpicDto.project_id) {
            const project = await this.projectRepository.findOne({
                where: { id: updateEpicDto.project_id },
            });

            if (!project) {
                throw new NotFoundException(
                    `Project with ID ${updateEpicDto.project_id} not found`,
                );
            }
        }

        // Validate dates
        const startDate = updateEpicDto.start_date
            ? new Date(updateEpicDto.start_date)
            : epic.start_date;
        const dueDate = updateEpicDto.due_date
            ? new Date(updateEpicDto.due_date)
            : epic.due_date;

        if (startDate && dueDate && startDate > dueDate) {
            throw new BadRequestException('Start date cannot be after due date');
        }

        await this.epicRepository.update(id, updateEpicDto);
        return this.findOne(id);
    }

    async remove(id: number): Promise<Epic> {
        const epic = await this.epicRepository.findOne({
            where: { id },
            relations: ['issues'],
        });

        if (!epic) {
            throw new NotFoundException(`Epic with ID ${id} not found`);
        }

        // Check if epic has linked issues
        if (epic.issues && epic.issues.length > 0) {
            throw new BadRequestException(
                `Cannot delete epic with ${epic.issues.length} linked issue(s). Please unlink issues first.`,
            );
        }

        await this.epicRepository.delete(id);
        return epic;
    }
}