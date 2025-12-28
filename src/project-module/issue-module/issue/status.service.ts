import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { WorkflowStatus } from 'src/database/entities/project-module/Workflow.entity';
import { MoveCardDto, ReorderCardsDto, ReorderColumnsDto } from './dto/board-operations.dto';
import { IssueHistoryService } from './issue-history.service';
import { IssueNotificationService } from 'src/project-module/notification/issue-notification.service';
import { Sprint } from 'src/database/entities/project-module/Sprint.entity';

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
    
    private readonly historyService: IssueHistoryService,
    
    // THÊM: Inject IssueNotificationService
    private readonly issueNotificationService: IssueNotificationService,
  ) {}

  
  
  // -------------------- NEW: Get Issues by Workflow Status --------------------
  
  /**
   * Truy vấn tất cả các Status thuộc về một Workflow và trả về danh sách Issues
   * được nhóm theo từng Status đó.
   * @param workflowId ID của Workflow.
   * @returns Mảng các đối tượng chứa Status và Issues tương ứng.
   */
  async getIssuesByWorkflowStatus(workflowId: number, projectId: number): Promise<BoardData> {
    // 1. Lấy tất cả các status thuộc về workflow này
    const statuses = await this.workflowStatusRepository.find({
      where: { workflow_id: workflowId },
      order: { order_index: 'ASC' },
    });

    if (!statuses || statuses.length === 0) {
      throw new NotFoundException(`No statuses found for workflow ID ${workflowId}`);
    }

    // 2. Tìm sprint đang active trong project
    const activeSprint = await this.dataSource.getRepository('Sprint').findOne({
      where: { 
        project_id: projectId,
        status: 'active' 
      },
    });

    const intermediateResult: IssuesByStatus[] = [];

    // 3. Với mỗi status, tìm các Issues đang ở trạng thái đó
    for (const status of statuses) {
      const whereClause: any = { 
        current_status_id: status.id,
        project_id: projectId,
      };

      // Chỉ lấy issues thuộc sprint active (nếu có)
      if (activeSprint) {
        whereClause.sprint_id = activeSprint.id;
      } else {
        whereClause.sprint_id = -1;
      }

      const issues = await this.issueRepository.find({
        where: whereClause,
        // QUAN TRỌNG: Cần thêm các relations để có đủ data cho Board
        relations: [
          'project', 
          'issue_type', 
          'assignees', 
          'epic_link', // Cần phải load thêm relation Epic
          'sprint',
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

    // 4. Chuyển đổi sang định dạng Board
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
 * THÊM: Gửi email notification khi thay đổi status
 */
async moveCard(issueId: number, dto: MoveCardDto, userId: number) {
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
    const oldStatus = await this.workflowStatusRepository.findOne({
        where: { id: oldStatusId },
    });

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

            // Ghi lại lịch sử thay đổi status
            await this.historyService.logChange(
                issueId,
                userId,
                'current_status_id',
                `${oldStatus?.status_name} (ID: ${oldStatusId})`,
                `${targetStatus.status_name} (ID: ${targetStatusId})`,
            );
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

    // THÊM: Gửi email notification khi status thay đổi
    // Chỉ gửi email khi thực sự thay đổi status (không phải chỉ reorder)
    if (oldStatusId !== targetStatusId) {
        try {
            await this.issueNotificationService.notifyStatusChanged(
                issueId,
                oldStatusId,
                targetStatusId,
                userId,
            );
        } catch (error) {
            // Log error nhưng không làm fail API
            console.error('Failed to send status change notification:', error);
        }
    }

    return {
        message: 'Card moved successfully',
        issueId,
        oldStatusId,
        newStatusId: targetStatusId,
        targetIndex,
    };
}
}

// Định nghĩa cấu trúc cho mỗi Assignee trong BoardItem
interface BoardAssignee {
  id: number;
  full_name: string;
  email?: string;
}

// Định nghĩa cấu trúc cho mỗi Item (Issue) trên Board
interface BoardItem {
  id: number; // ID nội bộ của Issue
  issueId: string; // Ví dụ: "ERP1", dựa trên issue_code
  name: string; // Tên người được Assign (Assignee) - giữ lại để tương thích
  summary: string;
  epic_name: string | null; // Tên Epic
  issue_type: string; // Tên loại issue
  priority: string; // Chưa có trong dữ liệu hiện tại, có thể để giá trị mặc định
  points: number | null; // story_points
  role: string; // Role của Assignee (Cần phải load thêm relation)
  avatarUrl: string; // Ảnh Assignee (Cần phải load thêm relation)
  
  // ===== CÁC TRƯỜNG MỚI CHO FILTER =====
  issue_type_id: number; // ID loại issue - để filter theo issue type
  epic_link_id: number | null; // ID epic - để filter theo epic
  assignees: BoardAssignee[]; // Danh sách assignees đầy đủ - để filter theo assignee
  project_id: number; // ID project
  current_status_id: number; // ID status hiện tại
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
      
      // Transform assignees thành format đơn giản cho frontend
      const assigneesForFilter: BoardAssignee[] = (issue.assignees || []).map(a => ({
        id: a.id,
        full_name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
        email: a.email,
      }));
      
      return {
        id: issue.id,
        issueId: issue.issue_code.toUpperCase(), // Sử dụng issue_code
        name: assignee ? `${assignee.first_name} ${assignee.last_name}` : '', // Giữ lại để tương thích
        summary: issue.summary,
        
        // Tên Epic
        epic_name: issue?.epic_link?.epic_name ?? '',
        
        // Tên loại issue
        issue_type: issue.issue_type?.type_name || '',
        
        priority: 'medium', // Tạm để mặc định, vì chưa có trường priority
        points: issue.story_points,
        
        // Role và Avatar cần load thêm quan hệ EmployeeRoleAssignment hoặc Employee.position
        role: '', 
        avatarUrl: '',
        
        // ===== CÁC TRƯỜNG MỚI CHO FILTER =====
        issue_type_id: issue.issue_type_id, // ID loại issue
        epic_link_id: issue.epic_link_id, // ID epic (có thể null)
        assignees: assigneesForFilter, // Danh sách assignees đầy đủ
        project_id: issue.project_id, // ID project
        current_status_id: issue.current_status_id, // ID status hiện tại
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