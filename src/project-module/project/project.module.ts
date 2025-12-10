import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { SchemeCloneService } from './scheme-clone.service';
import { SchemeListService } from './scheme-list.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../database/entities/project-module/Project.entity';
import {
  PermissionScheme,
  ProjectPermission,
  ProjectRole,
} from '../../database/entities/project-module/Permission.entity';
import {
  NotificationScheme,
  ProjectNotification,
} from '../../database/entities/project-module/Notification.entity';
import {
  WorkflowScheme,
  WorkflowSchemeMapping,
  Workflow,
  WorkflowStatus,
} from '../../database/entities/project-module/Workflow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Project
      Project,
      // Permission entities
      PermissionScheme,
      ProjectPermission,
      ProjectRole,
      // Notification entities
      NotificationScheme,
      ProjectNotification,
      // Workflow entities
      WorkflowScheme,
      WorkflowSchemeMapping,
      Workflow,
      WorkflowStatus,
    ]),
  ],
  controllers: [ProjectController],
  providers: [
    ProjectService, 
    SchemeCloneService,
    SchemeListService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
