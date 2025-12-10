import { Module } from '@nestjs/common';
import { IssueCommentController } from './issue-comment.controller';
import { IssueCommentService } from './issue-comment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueComment } from '../../../database/entities/project-module/Issue.entity';
import { Issue } from '../../../database/entities/project-module/Issue.entity'; // Cần thêm Issue
import { NotificationModule } from 'src/project-module/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueComment, Issue]),
    NotificationModule,
  ],
  controllers: [IssueCommentController],
  providers: [IssueCommentService],
})
export class IssueCommentModule {}