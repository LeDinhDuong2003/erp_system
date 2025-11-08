import { PartialType } from '@nestjs/mapped-types';
import { CreateIssueCommentDto } from './create-issue-comment.dto';
import { IsString, IsNotEmpty } from 'class-validator';

// Kế thừa các thuộc tính và làm cho chúng tùy chọn (optional)
export class UpdateIssueCommentDto extends PartialType(CreateIssueCommentDto) {
    @IsString()
    @IsNotEmpty()
    content: string; // Đảm bảo nội dung vẫn là string và không rỗng khi cập nhật
}