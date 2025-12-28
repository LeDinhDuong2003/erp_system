import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class ReorderWorkflowStatusesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  orderedStatusIds!: number[];
}