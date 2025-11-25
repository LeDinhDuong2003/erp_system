import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateIssueCommentDto {
  // issue_id sẽ được lấy từ URL param trong Controller, nên không cần ở đây.
  
  // employee_id thường được lấy từ JWT/Guard (người dùng hiện tại)
  // nhưng để đơn giản cho mục đích DTO, chúng ta tạm thời giữ nó.
  // Trong môi trường production, bạn nên loại bỏ nó khỏi body và lấy từ token.
  @IsNotEmpty()
  employee_id: number; 

  @IsString()
  @IsNotEmpty()
  content: string;
}