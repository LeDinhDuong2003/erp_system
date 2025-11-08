import { IsString, IsOptional } from 'class-validator';

export class ApproveLeaveRequestDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

