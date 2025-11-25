import { 
    Injectable, 
    NotFoundException, 
    ConflictException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueComment } from '../../../database/entities/project-module/Issue.entity';
import { CreateIssueCommentDto } from './dto/create-issue-comment.dto';
import { UpdateIssueCommentDto } from './dto/update-issue-comment.dto';
import { Issue } from '../../../database/entities/project-module/Issue.entity';

@Injectable()
export class IssueCommentService {
  constructor(
    @InjectRepository(IssueComment)
    private readonly commentRepository: Repository<IssueComment>,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>, // Cần kiểm tra Issue có tồn tại không
  ) {}

  // POST: Tạo bình luận mới cho một Issue cụ thể
  async create(issueId: number, createCommentDto: CreateIssueCommentDto) {
    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const newComment = this.commentRepository.create({
      ...createCommentDto,
      issue_id: issueId,
    });
    return await this.commentRepository.save(newComment);
  }

  // GET: Lấy tất cả bình luận của một Issue
  async findAllByIssue(issueId: number) {
    // Tùy chọn: join Employee để hiển thị tên người bình luận
    return this.commentRepository.find({
      where: { issue_id: issueId },
      relations: ['employee'], 
      order: { created_at: 'ASC' }, // Sắp xếp theo thời gian
    });
  }

  // GET: Lấy một bình luận cụ thể
  async findOne(id: number) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    return comment;
  }

  // PATCH: Cập nhật nội dung bình luận
  async update(id: number, updateCommentDto: UpdateIssueCommentDto) {
    const existing = await this.commentRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Comment with ID ${id} not found for update`);
    }
    // Chỉ cho phép cập nhật nội dung
    await this.commentRepository.update(id, { content: updateCommentDto.content });
    return this.commentRepository.findOne({ where: { id } });
  }

  // DELETE: Xóa bình luận
  async remove(id: number) {
    const existing = await this.commentRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Comment with ID ${id} not found for deletion`);
    }
    await this.commentRepository.delete(id);
    return existing;
  }
}