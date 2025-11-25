import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectRequestDto {
  @ApiProperty({ description: 'Lý do từ chối' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  rejection_reason: string;
}