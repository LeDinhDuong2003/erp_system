import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumberString,
} from 'class-validator';
import {
  RequestType,
  RequestStatus,
  RequestPriority,
} from '../../database/assetrequest/request.entity';

export class QueryRequestsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: RequestStatus, required: false })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiProperty({ enum: RequestType, required: false })
  @IsOptional()
  @IsEnum(RequestType)
  request_type?: RequestType;

  @ApiProperty({ enum: RequestPriority, required: false })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;
}