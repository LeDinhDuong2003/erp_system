import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateIssueLinkDto {
  @IsInt()
  @IsNotEmpty()
  target_issue_id: number;

  @IsString()
  @IsNotEmpty()
  link_type: string;
}

// Common link types
export enum IssueLinkType {
  BLOCKS = 'blocks',
  IS_BLOCKED_BY = 'is_blocked_by',
  RELATES_TO = 'relates_to',
  DUPLICATES = 'duplicates',
  IS_DUPLICATED_BY = 'is_duplicated_by',
  CAUSES = 'causes',
  IS_CAUSED_BY = 'is_caused_by',
  PARENT_OF = 'parent_of',
  CHILD_OF = 'child_of',
}