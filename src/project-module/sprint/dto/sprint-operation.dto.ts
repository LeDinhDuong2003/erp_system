import { IsNotEmpty, IsInt, IsString, IsIn, IsArray, IsOptional } from 'class-validator';

// DTO for changing sprint status
export class ChangeSprintStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['planning', 'active', 'completed', 'closed'])
  status: string;
}

// DTO for adding issue to sprint
export class AddIssueToSprintDto {
  @IsInt()
  @IsNotEmpty()
  issue_id: number;

  @IsOptional()
  @IsInt()
  rank_order?: number;
}

// DTO for moving issue between sprints
export class MoveIssueBetweenSprintsDto {
  @IsInt()
  @IsNotEmpty()
  issue_id: number;

  @IsInt()
  @IsNotEmpty()
  target_sprint_id: number; // Use 0 or null for backlog

  @IsOptional()
  @IsInt()
  rank_order?: number;
}

// DTO for bulk moving issues
export class BulkMoveIssuesDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  issue_ids: number[];

  @IsInt()
  @IsNotEmpty()
  target_sprint_id: number; // Use 0 for backlog
}

// DTO for reordering issues in sprint
export class ReorderSprintIssuesDto {
  @IsArray()
  @IsNotEmpty()
  ordered_issue_ids: number[]; // Array of issue IDs in new order
}