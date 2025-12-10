import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPermissionService } from './project-permission.service';
import { ProjectPermissionGuard } from './project-permission.guard';
import {
    ProjectRoleAssignment,
    ProjectPermission,
    ProjectRole,
    PermissionScheme,
} from '../../database/entities/project-module/Permission.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { Issue } from '../../database/entities/project-module/Issue.entity';

/**
 * Global module cho permission system
 * Có thể sử dụng ở bất kỳ module nào mà không cần import
 */
@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProjectRoleAssignment,
            ProjectPermission,
            ProjectRole,
            PermissionScheme,
            Project,
            Issue,
        ]),
    ],
    providers: [ProjectPermissionService, ProjectPermissionGuard],
    exports: [ProjectPermissionService, ProjectPermissionGuard],
})
export class ProjectPermissionModule {}