import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRoleController } from './project-role.controller';
import { ProjectRoleService } from './project-role.service';
import {
    ProjectRole,
    ProjectPermission,
    PermissionScheme,
    ProjectRoleAssignment,
} from '../../database/entities/project-module/Permission.entity';
import { Project } from '../../database/entities/project-module/Project.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProjectRole,
            ProjectPermission,
            PermissionScheme,
            ProjectRoleAssignment,
            Project,
        ]),
    ],
    controllers: [ProjectRoleController],
    providers: [ProjectRoleService],
    exports: [ProjectRoleService],
})
export class ProjectRoleModule {}