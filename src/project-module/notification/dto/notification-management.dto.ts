import { IsNotEmpty, IsString, IsInt, IsOptional, IsEnum, IsArray } from 'class-validator';

// DTO để tạo Notification Scheme mới
export class CreateNotificationSchemeDto {
  @IsString()
  @IsNotEmpty()
  scheme_name: string;

  @IsString()
  @IsOptional()
  scheme_description?: string;
}

// DTO để update Notification Scheme
export class UpdateNotificationSchemeDto {
  @IsString()
  @IsOptional()
  scheme_name?: string;

  @IsString()
  @IsOptional()
  scheme_description?: string;
}

// DTO để tạo Notification Rule mới
export class CreateNotificationRuleDto {
  @IsInt()
  @IsNotEmpty()
  notification_scheme_id: number;

  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsString()
  @IsNotEmpty()
  recipient_type: string; // Reporter, Assignee, Watcher, Project Lead, Specific Employee

  @IsString()
  @IsOptional()
  recipient_value?: string; // Dùng cho specific employee ID hoặc group name
}

// DTO để update Notification Rule
export class UpdateNotificationRuleDto {
  @IsString()
  @IsOptional()
  event_name?: string;

  @IsString()
  @IsOptional()
  recipient_type?: string;

  @IsString()
  @IsOptional()
  recipient_value?: string;
}

// DTO để assign notification scheme cho project
export class AssignSchemeToProjectDto {
  @IsInt()
  @IsNotEmpty()
  project_id: number;

  @IsInt()
  @IsNotEmpty()
  notification_scheme_id: number;
}

// DTO để bulk add recipients
export class BulkAddRecipientsDto {
  @IsInt()
  @IsNotEmpty()
  notification_scheme_id: number;

  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  recipient_types: string[]; // ['Reporter', 'Assignee', 'Watcher']
}

// DTO để bulk remove recipients
export class BulkRemoveRecipientsDto {
  @IsInt()
  @IsNotEmpty()
  notification_scheme_id: number;

  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  recipient_types: string[];
}

// DTO để filter notifications
export class FilterNotificationDto {
  @IsInt()
  @IsOptional()
  scheme_id?: number;

  @IsString()
  @IsOptional()
  event_name?: string;

  @IsString()
  @IsOptional()
  recipient_type?: string;
}

// DTO để clone notification scheme
export class CloneNotificationSchemeDto {
  @IsInt()
  @IsNotEmpty()
  source_scheme_id: number;

  @IsString()
  @IsNotEmpty()
  new_scheme_name: string;

  @IsString()
  @IsOptional()
  new_scheme_description?: string;
}