import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epic, Issue, IssueComment, IssueLink, IssueType, IssueChangeHistory } from '../../../database/entities/project-module/Issue.entity';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { Employee } from 'src/database/entities/Employee.entity';
import { WorkflowSchemeMapping, WorkflowStatus } from 'src/database/entities/project-module/Workflow.entity';
import { IssueBoardService } from './status.service';
import { Project } from 'src/database/entities/project-module/Project.entity';
import { IssueHistoryService } from './issue-history.service';
import { NotificationModule } from 'src/project-module/notification/notification.module';
import { Sprint } from 'src/database/entities/project-module/Sprint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue, 
      Employee, 
      WorkflowStatus,
      IssueType,
      IssueComment,
      IssueLink,
      Project,
      Epic,
      IssueChangeHistory,
      WorkflowSchemeMapping,
      Sprint,
    ]),
    NotificationModule
  ],
  controllers: [IssueController],
  providers: [IssueService, IssueBoardService, IssueHistoryService],
  exports: [IssueService, IssueBoardService, IssueHistoryService],
})
export class IssueModule {}