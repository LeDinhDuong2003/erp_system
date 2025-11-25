import { 
    Controller, 
    Post, 
    Body, 
    Get, 
    Patch, 
    Param, 
    Delete, 
    ParseIntPipe,
} from '@nestjs/common';
import { IssueCommentService } from './issue-comment.service';
import { CreateIssueCommentDto } from './dto/create-issue-comment.dto';
import { UpdateIssueCommentDto } from './dto/update-issue-comment.dto';

// Sử dụng cấu trúc lồng nhau: issues/:issueId/comments
@Controller('issues/:issueId/comments')
export class IssueCommentController {
  constructor(private readonly issueCommentService: IssueCommentService) {}

  @Post() // POST /issues/:issueId/comments
  async create(
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() createCommentDto: CreateIssueCommentDto,
  ) {
    return this.issueCommentService.create(issueId, createCommentDto);
  }

  @Get() // GET /issues/:issueId/comments
  async findAllByIssue(@Param('issueId', ParseIntPipe) issueId: number) {
    return this.issueCommentService.findAllByIssue(issueId);
  }

  @Patch(':id') // PATCH /issues/:issueId/comments/:id
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateIssueCommentDto,
  ) {
    // Lưu ý: issueId không cần thiết cho logic update/delete đơn giản, 
    // nhưng có thể được dùng để kiểm tra quyền truy cập.
    return this.issueCommentService.update(id, updateCommentDto);
  }

  @Delete(':id') // DELETE /issues/:issueId/comments/:id
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.issueCommentService.remove(id);
  }
}