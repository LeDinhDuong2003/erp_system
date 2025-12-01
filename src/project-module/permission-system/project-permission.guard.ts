import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectPermissionService } from './project-permission.service';

/**
 * Guard để check permission trước khi thực hiện action
 * Sử dụng với decorator @RequirePermission()
 */
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly permissionService: ProjectPermissionService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Lấy required permission từ decorator
        const requiredPermission = this.reflector.get<string>(
            'permission',
            context.getHandler(),
        );

        // Nếu không có required permission, cho phép truy cập
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        const userId = user.id;

        // Lấy projectId từ params hoặc body
        let projectId: number | undefined;
        let resourceId: number | undefined;

        // Priority 1: Từ params (ví dụ: /projects/:projectId/...)
        if (request.params.projectId) {
            projectId = parseInt(request.params.projectId);
        }

        // Priority 2: Từ body
        if (!projectId && request.body?.project_id) {
            projectId = request.body.project_id;
        }

        // Priority 3: Từ query
        if (!projectId && request.query?.projectId) {
            projectId = parseInt(request.query.projectId as string);
        }

        // Priority 4: Từ issue ID (lấy project từ issue)
        if (!projectId && request.params.id) {
            const issueId = parseInt(request.params.id);
            try {
                projectId = await this.permissionService.getProjectIdFromIssue(issueId);
                resourceId = issueId;
            } catch (error) {
                // Issue not found, let the controller handle it
                return true;
            }
        }

        if (!projectId) {
            throw new ForbiddenException('Project ID not found in request');
        }

        // Check permission
        const hasPermission = await this.permissionService.checkPermission(
            userId,
            projectId,
            requiredPermission,
            resourceId,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `You don't have permission to ${requiredPermission} in this project`,
            );
        }

        return true;
    }
}