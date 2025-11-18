import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { WorkflowStatus } from 'src/database/entities/project-module/Workflow.entity';
import { MoveCardDto, ReorderCardsDto, ReorderColumnsDto } from './dto/board-operations.dto';

// Định nghĩa kiểu dữ liệu cho kết quả trả về
interface IssuesByStatus {
  status_id: number;
  status_name: string;
  is_initial_status: boolean;
  issues: Issue[];
}

@Injectable()
export class IssueBoardService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,

    // Inject WorkflowStatus Repository
    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,

    private readonly dataSource: DataSource,
  ) {}

  
  
  // -------------------- NEW: Get Issues by Workflow Status --------------------
  
  /**
   * Truy vấn tất cả các Status thuộc về một Workflow và trả về danh sách Issues
   * được nhóm theo từng Status đó.
   * @param workflowId ID của Workflow.
   * @returns Mảng các đối tượng chứa Status và Issues tương ứng.
   */
  async getIssuesByWorkflowStatus(workflowId: number): Promise<BoardData> { // Thay đổi kiểu trả về
    // 1. Lấy tất cả các status thuộc về workflow này
    const statuses = await this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
      order: { order_index: 'ASC' },
    });

    // ... (Kiểm tra NotFoundException) ...

    const intermediateResult: IssuesByStatus[] = [];

    // 2. Với mỗi status, tìm các Issues đang ở trạng thái đó
    for (const status of statuses) {
      const issues = await this.issueRepository.find({
        where: { current_status_id: status.id },
        // QUAN TRỌNG: Cần thêm các relations để có đủ data cho Board
        relations: [
          'project', 
          'issue_type', 
          'assignees', 
          'epic_link', // Cần phải load thêm relation Epic
        ],
        order: { order_index: 'ASC' }, // Sắp xếp Issues trong Column
      });

      intermediateResult.push({
        status_id: status.id,
        status_name: status.status_name,
        is_initial_status: status.is_initial_status,
        issues: issues,
      });
    }

    // 3. Chuyển đổi sang định dạng Board
    return transformIssuesToBoardFormat(intermediateResult);
  }

  /**
     * API 1: Reorder Columns (Workflow Statuses)
     * Cập nhật order_index của các workflow statuses
     */
  async reorderColumns(workflowId: number, dto: ReorderColumnsDto) {
    const { orderedColumnIds } = dto;

    // Verify tất cả statuses thuộc về workflow này
    const statuses = await this.workflowStatusRepository.find({
        where: { workflow_id: workflowId },
    });

    const statusIds = statuses.map(s => s.id);
    const invalidIds = orderedColumnIds.filter(id => !statusIds.includes(id));

    if (invalidIds.length > 0) {
        throw new BadRequestException(
            `Invalid status IDs: ${invalidIds.join(', ')} do not belong to workflow ${workflowId}`
        );
    }

    if (orderedColumnIds.length !== statuses.length) {
        throw new BadRequestException(
            `Expected ${statuses.length} status IDs but got ${orderedColumnIds.length}`
        );
    }

    // Sử dụng transaction để cập nhật order_index
    await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < orderedColumnIds.length; i++) {
            await manager.update(
                WorkflowStatus,
                { id: orderedColumnIds[i] },
                { order_index: i }
            );
        }
    });

    return {
        message: 'Columns reordered successfully',
        workflowId,
        orderedColumnIds,
    };
}

/**
 * API 2: Reorder Cards in Same Column
 * Cập nhật order_index của các issues trong cùng status
 */
async reorderCards(statusId: number, dto: ReorderCardsDto) {
    const { orderedIssueIds } = dto;

    // Verify status exists
    const status = await this.workflowStatusRepository.findOne({
        where: { id: statusId },
    });

    if (!status) {
        throw new NotFoundException(`Status with ID ${statusId} not found`);
    }

    // Lấy tất cả issues thuộc status này
    const issues = await this.issueRepository.find({
        where: { current_status_id: statusId },
    });

    const issueIds = issues.map(i => i.id);
    const invalidIds = orderedIssueIds.filter(id => !issueIds.includes(id));

    if (invalidIds.length > 0) {
        throw new BadRequestException(
            `Invalid issue IDs: ${invalidIds.join(', ')} do not belong to status ${statusId}`
        );
    }

    if (orderedIssueIds.length !== issues.length) {
        throw new BadRequestException(
            `Expected ${issues.length} issue IDs but got ${orderedIssueIds.length}`
        );
    }

    // Sử dụng transaction để cập nhật order_index
    await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < orderedIssueIds.length; i++) {
            await manager.update(
                Issue,
                { id: orderedIssueIds[i] },
                { order_index: i }
            );
        }
    });

    return {
        message: 'Cards reordered successfully',
        statusId,
        orderedIssueIds,
    };
}

/**
 * API 3: Move Card to Different Column
 * Di chuyển issue sang status mới và cập nhật order_index
 */
async moveCard(issueId: number, dto: MoveCardDto) {
    const { targetStatusId, targetIndex } = dto;

    // Verify issue exists
    const issue = await this.issueRepository.findOne({
        where: { id: issueId },
    });

    if (!issue) {
        throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    // Verify target status exists
    const targetStatus = await this.workflowStatusRepository.findOne({
        where: { id: targetStatusId },
    });

    if (!targetStatus) {
        throw new NotFoundException(`Status with ID ${targetStatusId} not found`);
    }

    const oldStatusId = issue.current_status_id;

    await this.dataSource.transaction(async (manager) => {
        // 1. Nếu di chuyển sang status khác
        if (oldStatusId !== targetStatusId) {
            // Cập nhật status của issue
            await manager.update(
                Issue,
                { id: issueId },
                { 
                    current_status_id: targetStatusId,
                    order_index: targetIndex 
                }
            );

            // 2. Reindex các issues còn lại trong old status
            const remainingIssuesInOldStatus = await manager.find(Issue, {
                where: { current_status_id: oldStatusId },
                order: { order_index: 'ASC' },
            });

            for (let i = 0; i < remainingIssuesInOldStatus.length; i++) {
                await manager.update(
                    Issue,
                    { id: remainingIssuesInOldStatus[i].id },
                    { order_index: i }
                );
            }

            // 3. Reindex các issues trong target status
            const issuesInTargetStatus = await manager.find(Issue, {
                where: { current_status_id: targetStatusId },
                order: { order_index: 'ASC' },
            });

            // Chèn issue vào vị trí targetIndex
            const reorderedIssues = [...issuesInTargetStatus];
            const movedIssueInArray = reorderedIssues.find(i => i.id === issueId);
            
            if (movedIssueInArray) {
                // Remove from current position
                const currentIndex = reorderedIssues.indexOf(movedIssueInArray);
                reorderedIssues.splice(currentIndex, 1);
                
                // Insert at target position
                reorderedIssues.splice(targetIndex, 0, movedIssueInArray);

                // Update order_index for all
                for (let i = 0; i < reorderedIssues.length; i++) {
                    await manager.update(
                        Issue,
                        { id: reorderedIssues[i].id },
                        { order_index: i }
                    );
                }
            }
        } else {
            // Nếu di chuyển trong cùng status, chỉ cần reorder
            const issuesInStatus = await manager.find(Issue, {
                where: { current_status_id: targetStatusId },
                order: { order_index: 'ASC' },
            });

            const reorderedIssues = [...issuesInStatus];
            const movedIssueInArray = reorderedIssues.find(i => i.id === issueId);
            
            if (movedIssueInArray) {
                const currentIndex = reorderedIssues.indexOf(movedIssueInArray);
                reorderedIssues.splice(currentIndex, 1);
                reorderedIssues.splice(targetIndex, 0, movedIssueInArray);

                for (let i = 0; i < reorderedIssues.length; i++) {
                    await manager.update(
                        Issue,
                        { id: reorderedIssues[i].id },
                        { order_index: i }
                    );
                }
            }
        }
    });

    return {
        message: 'Card moved successfully',
        issueId,
        oldStatusId,
        newStatusId: targetStatusId,
        targetIndex,
    };
}
}

// Định nghĩa cấu trúc cho mỗi Item (Issue) trên Board
interface BoardItem {
  id: number; // ID nội bộ của Issue
  issueId: string; // Ví dụ: "ERP1", dựa trên issue_code
  name: string; // Tên người được Assign (Assignee)
  summary: string;
  epic_name: string | null; // Tên Epic (Cần phải load thêm relation)
  issue_type: string;
  priority: string; // Chưa có trong dữ liệu hiện tại, có thể để giá trị mặc định
  points: number | null; // story_points
  role: string; // Role của Assignee (Cần phải load thêm relation)
  avatarUrl: string; // Ảnh Assignee (Cần phải load thêm relation)
}

// Định nghĩa cấu trúc cho mỗi Column
interface BoardColumn {
  title: string;
  columnId: string;
  items: BoardItem[];
}

// Định nghĩa cấu trúc dữ liệu Board cuối cùng
interface BoardData {
  columnMap: Record<string, BoardColumn>;
  orderedColumnIds: string[];
}

/**
 * Chuyển đổi dữ liệu Issue được nhóm theo Status sang định dạng Board (Trello/Jira-like).
 * @param issuesByStatus Mảng Issues được nhóm theo Status (kết quả từ getIssuesByWorkflowStatus).
 * @returns Đối tượng BoardData có cấu trúc columnMap và orderedColumnIds.
 */
function transformIssuesToBoardFormat(issuesByStatus: IssuesByStatus[]): BoardData {
  const columnMap: Record<string, BoardColumn> = {};
  const orderedColumnIds: string[] = [];

  for (const statusGroup of issuesByStatus) {
    // Tạo columnId từ status_name (Ví dụ: "To Do" -> "to_do")
    const columnId = statusGroup.status_id.toString();

    // Lấy thông tin Issue (Item)
    const boardItems: BoardItem[] = statusGroup.issues.map(issue => {
      // Lấy Assignee đầu tiên (nếu có), nếu không có thì để trống
      const assignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : null;
      
      return {
        id: issue.id,
        issueId: issue.issue_code.toUpperCase(), // Sử dụng issue_code
        name: assignee ? `${assignee.first_name} ${assignee.last_name}` : '', // Cần field first_name/last_name trong Assignee Entity
        summary: issue.summary,
        
        // Cần phải load thêm quan hệ 'epic_link' (đã bị comment out trong Issue.entity) 
        // và 'reporter' (có sẵn) để lấy tên Epic và Reporter.
        epic_name: issue?.epic_link?.epic_name ?? '', // Tạm để trống
        
        issue_type: issue.issue_type.type_name,
        priority: 'medium', // Tạm để mặc định, vì chưa có trường priority
        points: issue.story_points,
        
        // Role và Avatar cần load thêm quan hệ EmployeeRoleAssignment hoặc Employee.position
        role: '', 
        avatarUrl: '',
      };
    });

    // Xây dựng Column
    columnMap[columnId] = {
      title: statusGroup.status_name,
      columnId: columnId,
      items: boardItems,
    };

    orderedColumnIds.push(columnId);
  }

  return {
    columnMap,
    orderedColumnIds,
  };

}