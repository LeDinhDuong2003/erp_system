import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Project } from '../../database/entities/project-module/Project.entity';
import { Issue, Epic } from '../../database/entities/project-module/Issue.entity';
import { Sprint, SprintIssue } from '../../database/entities/project-module/Sprint.entity';
import { WorkflowStatus } from '../../database/entities/project-module/Workflow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Issue,
      Epic,
      Sprint,
      SprintIssue,
      WorkflowStatus,
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}