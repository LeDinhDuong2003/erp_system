import { IsArray, IsInt, IsNotEmpty, Min } from 'class-validator';

/**
 * DTO cho việc reorder columns (workflow statuses)
 */
export class ReorderColumnsDto {
    @IsArray()
    @IsInt({ each: true })
    @IsNotEmpty()
    orderedColumnIds!: number[]; // Mảng status IDs theo thứ tự mới
}

/**
 * DTO cho việc reorder cards trong cùng column
 */
export class ReorderCardsDto {
    @IsArray()
    @IsInt({ each: true })
    @IsNotEmpty()
    orderedIssueIds!: number[]; // Mảng issue IDs theo thứ tự mới
}

/**
 * DTO cho việc move card sang column khác
 */
export class MoveCardDto {
    @IsInt()
    @IsNotEmpty()
    targetStatusId!: number; // Status ID đích

    @IsInt()
    @Min(0)
    @IsNotEmpty()
    targetIndex!: number; // Vị trí mới trong status đích
}