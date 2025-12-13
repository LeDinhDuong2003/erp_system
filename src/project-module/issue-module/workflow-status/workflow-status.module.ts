import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowStatusController } from './workflow-status.controller';
import { WorkflowStatusService } from './workflow-status.service';
import { WorkflowStatus, Workflow } from '../../../database/entities/project-module/Workflow.entity';
import { Issue } from '../../../database/entities/project-module/Issue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowStatus, Workflow, Issue]),
  ],
  controllers: [WorkflowStatusController],
  providers: [WorkflowStatusService],
  exports: [WorkflowStatusService],
})
export class WorkflowStatusModule {}