import { Module } from '@nestjs/common';
import { IssueCommentController } from './issue-comment.controller';
import { IssueCommentService } from './issue-comment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueComment } from '../../../database/entities/project-module/Issue.entity';
import { Issue } from '../../../database/entities/project-module/Issue.entity'; // Cần thêm Issue

@Module({
  imports: [TypeOrmModule.forFeature([IssueComment, Issue])], // Đảm bảo cả IssueComment và Issue đều được cung cấp
  controllers: [IssueCommentController],
  providers: [IssueCommentService],
})
export class IssueCommentModule {}