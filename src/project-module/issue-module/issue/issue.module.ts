import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { Employee } from 'src/database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Issue, Employee])],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService],
})
export class IssueModule {}