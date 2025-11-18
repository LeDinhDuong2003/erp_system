import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epic, Issue, IssueComment, IssueLink, IssueType } from '../../../database/entities/project-module/Issue.entity';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { Employee } from 'src/database/entities/Employee.entity';
import { WorkflowStatus } from 'src/database/entities/project-module/Workflow.entity'; // Import WorkflowStatus
import { IssueBoardService } from './status.service';
import { Project } from 'src/database/entities/project-module/Project.entity';

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
    ])
  ],
  controllers: [IssueController],
  providers: [IssueService, IssueBoardService],
  exports: [IssueService, IssueBoardService],
})
export class IssueModule {}