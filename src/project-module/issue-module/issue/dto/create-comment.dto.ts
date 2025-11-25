import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  @IsNotEmpty()
  employee_id: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}