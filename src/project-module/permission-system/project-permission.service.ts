import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    ProjectRoleAssignment,
    ProjectPermission,
    PermissionScope,
} from '../../database/entities/project-module/Permission.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { Issue } from '../../database/entities/project-module/Issue.entity';

/**
 * Service để check permissions của user trong project
 */
@Injectable()
export class ProjectPermissionService {
    constructor(
        @InjectRepository(ProjectRoleAssignment)
        private readonly roleAssignmentRepository: Repository<ProjectRoleAssignment>,

        @InjectRepository(ProjectPermission)
        private readonly permissionRepository: Repository<ProjectPermission>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,

        @InjectRepository(Issue)
        private readonly issueRepository: Repository<Issue>,
    ) {}

    /**
     * Check xem user có quyền trong project không
     */
    async checkPermission(
        userId: number,
        projectId: number,
        action: string,
        resourceId?: number,
    ): Promise<boolean> {
        // 1. Lấy role assignment của user trong project
        const roleAssignment = await this.roleAssignmentRepository.findOne({
            where: {
                employee_id: userId,
                project_id: projectId,
            },
            relations: ['project_role'],
        });

        // Nếu không phải member của project
        if (!roleAssignment) {
            return false;
        }

        // 2. Lấy permission scheme của project
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            return false;
        }

        // 3. Lấy tất cả permissions cho action này trong scheme
        const permissions = await this.permissionRepository.find({
            where: {
                permission_scheme_id: project.permission_scheme_id,
                action_key: action,
            },
            relations: ['project_role'],
        });

        if (permissions.length === 0) {
            return false;
        }

        // 4. Check từng permission
        for (const permission of permissions) {
            // Check ROLE-based permission
            if (
                permission.recipient_type === PermissionScope.ROLE &&
                permission.project_role_id === roleAssignment.project_role_id
            ) {
                return true;
            }

            // Check EMPLOYEE-based permission (specific user)
            if (
                permission.recipient_type === PermissionScope.EMPLOYEE &&
                permission.specific_employee_id === userId
            ) {
                return true;
            }

            // Check REPORTER permission (user là reporter của issue)
            if (
                permission.recipient_type === PermissionScope.REPORTER &&
                resourceId
            ) {
                const issue = await this.issueRepository.findOne({
                    where: { id: resourceId },
                });
                if (issue && issue.reporter_id === userId) {
                    return true;
                }
            }

            // Check ASSIGNEE permission (user được assign issue)
            if (
                permission.recipient_type === PermissionScope.ASSIGNEE &&
                resourceId
            ) {
                const issue = await this.issueRepository.findOne({
                    where: { id: resourceId },
                    relations: ['assignees'],
                });
                if (issue && issue.assignees.some((a) => a.id === userId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check permission và throw exception nếu không có quyền
     */
    async requirePermission(
        userId: number,
        projectId: number,
        action: string,
        resourceId?: number,
    ): Promise<void> {
        const hasPermission = await this.checkPermission(
            userId,
            projectId,
            action,
            resourceId,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `You don't have permission to ${action} in this project`,
            );
        }
    }

    /**
     * Check xem user có phải là member của project không
     */
    async isMemberOfProject(userId: number, projectId: number): Promise<boolean> {
        const roleAssignment = await this.roleAssignmentRepository.findOne({
            where: {
                employee_id: userId,
                project_id: projectId,
            },
        });

        return !!roleAssignment;
    }

    /**
     * Lấy role của user trong project
     */
    async getUserRole(userId: number, projectId: number): Promise<string | null> {
        const roleAssignment = await this.roleAssignmentRepository.findOne({
            where: {
                employee_id: userId,
                project_id: projectId,
            },
            relations: ['project_role'],
        });

        return roleAssignment?.project_role?.role_name || null;
    }

    /**
     * Check xem user có quyền admin trong project không
     */
    async isProjectAdmin(userId: number, projectId: number): Promise<boolean> {
        const role = await this.getUserRole(userId, projectId);
        return role?.toLowerCase().includes('admin') || false;
    }

    /**
     * Get project ID from issue ID
     */
    async getProjectIdFromIssue(issueId: number): Promise<number> {
        const issue = await this.issueRepository.findOne({
            where: { id: issueId },
        });

        if (!issue) {
            throw new NotFoundException(`Issue with ID ${issueId} not found`);
        }

        return issue.project_id;
    }

    /**
     * Check multiple permissions at once
     */
    async checkMultiplePermissions(
        userId: number,
        projectId: number,
        actions: string[],
    ): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const action of actions) {
            results[action] = await this.checkPermission(userId, projectId, action);
        }

        return results;
    }
}