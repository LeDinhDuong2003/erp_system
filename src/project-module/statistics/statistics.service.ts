import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Project } from '../../database/entities/project-module/Project.entity';
import { Issue, Epic } from '../../database/entities/project-module/Issue.entity';
import { Sprint } from '../../database/entities/project-module/Sprint.entity';
import { WorkflowStatus } from '../../database/entities/project-module/Workflow.entity';
import {
  ProjectOverallStatistics,
  IssueStatistics,
  EpicStatistics,
  SprintStatistics,
  StatusBreakdown,
  TypeBreakdown,
  AssigneeBreakdown,
  EpicStatusBreakdown,
  EpicIssueDistribution,
  SprintStatusBreakdown,
  SprintPerformance,
  VelocityTrend,
  TeamStatistics,
  TopContributor,
} from './interfaces/statistics.interface';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,

    @InjectRepository(Epic)
    private readonly epicRepository: Repository<Epic>,

    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,

    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,
  ) {}

  // ==================== PROJECT OVERALL STATISTICS ====================

  async getProjectOverallStatistics(
    projectId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<ProjectOverallStatistics> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const [issueStats, epicStats, sprintStats, teamStats] = await Promise.all([
      this.getIssueStatistics(projectId, startDate, endDate),
      this.getEpicStatistics(projectId, startDate, endDate),
      this.getSprintStatistics(projectId, startDate, endDate),
      this.getTeamStatistics(projectId),
    ]);

    return {
      project_id: project.id,
      project_name: project.project_name,
      project_key: project.project_key,
      issue_stats: issueStats,
      epic_stats: epicStats,
      sprint_stats: sprintStats,
      team_stats: teamStats,
    };
  }

  // ==================== ISSUE STATISTICS ====================

  async getIssueStatistics(
    projectId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<IssueStatistics> {
    const whereClause: any = { project_id: projectId };

    if (startDate && endDate) {
      whereClause.created_at = Between(new Date(startDate), new Date(endDate));
    }

    const issues = await this.issueRepository.find({
      where: whereClause,
      relations: [
        'current_status',
        'issue_type',
        'assignees',
      ],
    });

    const totalIssues = issues.length;

    // By Status
    const statusMap = new Map<number, { name: string; count: number }>();
    issues.forEach((issue) => {
      const statusId = issue.current_status_id;
      const statusName = issue.current_status?.status_name || 'Unknown';
      const existing = statusMap.get(statusId) || { name: statusName, count: 0 };
      existing.count++;
      statusMap.set(statusId, existing);
    });

    const byStatus: StatusBreakdown[] = Array.from(statusMap.entries()).map(
      ([statusId, data]) => ({
        status_id: statusId,
        status_name: data.name,
        count: data.count,
        percentage: totalIssues > 0 ? (data.count / totalIssues) * 100 : 0,
      }),
    );

    // By Type
    const typeMap = new Map<number, { name: string; count: number }>();
    issues.forEach((issue) => {
      const typeId = issue.issue_type_id;
      const typeName = issue.issue_type?.type_name || 'Unknown';
      const existing = typeMap.get(typeId) || { name: typeName, count: 0 };
      existing.count++;
      typeMap.set(typeId, existing);
    });

    const byType: TypeBreakdown[] = Array.from(typeMap.entries()).map(
      ([typeId, data]) => ({
        issue_type_id: typeId,
        type_name: data.name,
        count: data.count,
        percentage: totalIssues > 0 ? (data.count / totalIssues) * 100 : 0,
      }),
    );

    // By Assignee
    const assigneeMap = new Map<number, {
      name: string;
      total: number;
      completed: number;
      inProgress: number;
    }>();

    issues.forEach((issue) => {
      issue.assignees?.forEach((assignee) => {
        const existing = assigneeMap.get(assignee.id) || {
          name: `${assignee.first_name} ${assignee.last_name}`,
          total: 0,
          completed: 0,
          inProgress: 0,
        };
        existing.total++;

        const statusCategory = issue.current_status?.status_category?.toLowerCase();
        if (statusCategory === 'done') {
          existing.completed++;
        } else if (statusCategory === 'in progress') {
          existing.inProgress++;
        }

        assigneeMap.set(assignee.id, existing);
      });
    });

    const byAssignee: AssigneeBreakdown[] = Array.from(assigneeMap.entries()).map(
      ([employeeId, data]) => ({
        employee_id: employeeId,
        employee_name: data.name,
        count: data.total,
        completed: data.completed,
        in_progress: data.inProgress,
      }),
    );

    // Resolution Stats
    const resolvedCount = issues.filter(
      (issue) => issue.current_status?.status_category?.toLowerCase() === 'done',
    ).length;
    const unresolvedCount = totalIssues - resolvedCount;
    const resolutionRate = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0;

    // Time Stats
    const totalStoryPoints = issues.reduce(
      (sum, issue) => sum + (issue.story_points || 0),
      0,
    );
    const averageStoryPoints = totalIssues > 0 ? totalStoryPoints / totalIssues : 0;
    const totalEstimatedSeconds = issues.reduce(
      (sum, issue) => sum + (issue.original_estimate_seconds || 0),
      0,
    );
    const totalSpentSeconds = issues.reduce(
      (sum, issue) => sum + (issue.time_spent_seconds || 0),
      0,
    );

    return {
      total_issues: totalIssues,
      by_status: byStatus,
      by_type: byType,
      by_assignee: byAssignee,
      resolution_stats: {
        resolved: resolvedCount,
        unresolved: unresolvedCount,
        resolution_rate: resolutionRate,
      },
      time_stats: {
        total_story_points: totalStoryPoints,
        average_story_points: averageStoryPoints,
        total_estimated_hours: totalEstimatedSeconds / 3600,
        total_spent_hours: totalSpentSeconds / 3600,
      },
    };
  }

  // ==================== EPIC STATISTICS ====================

  async getEpicStatistics(
    projectId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<EpicStatistics> {
    const whereClause: any = { project_id: projectId };

    if (startDate && endDate) {
      whereClause.start_date = Between(new Date(startDate), new Date(endDate));
    }

    const epics = await this.epicRepository.find({
      where: whereClause,
      relations: ['issues', 'issues.current_status'],
    });

    const totalEpics = epics.length;

    // By Status
    const statusMap = new Map<string, number>();
    epics.forEach((epic) => {
      const status = epic.status || 'not_started';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const byStatus: EpicStatusBreakdown[] = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
        percentage: totalEpics > 0 ? (count / totalEpics) * 100 : 0,
      }),
    );

    // Completion Stats
    const completedCount = epics.filter(
      (epic) => epic.status?.toLowerCase() === 'completed' || epic.status?.toLowerCase() === 'done',
    ).length;
    const inProgressCount = epics.filter(
      (epic) => epic.status?.toLowerCase() === 'in progress' || epic.status?.toLowerCase() === 'active',
    ).length;
    const notStartedCount = totalEpics - completedCount - inProgressCount;

    // Issue Distribution
    const issueDistribution: EpicIssueDistribution[] = epics.map((epic) => {
      const totalIssues = epic.issues?.length || 0;
      const completedIssues = epic.issues?.filter(
        (issue) => issue.current_status?.status_category?.toLowerCase() === 'done',
      ).length || 0;

      return {
        epic_id: epic.id,
        epic_name: epic.epic_name,
        total_issues: totalIssues,
        completed_issues: completedIssues,
        progress_percentage: totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0,
      };
    });

    // Timeline Stats
    const now = new Date();
    let onTrack = 0;
    let atRisk = 0;
    let overdue = 0;
    let totalDuration = 0;
    let epicWithDates = 0;

    epics.forEach((epic) => {
      if (epic.start_date && epic.due_date) {
        epicWithDates++;
        const duration = Math.ceil(
          (new Date(epic.due_date).getTime() - new Date(epic.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
        );
        totalDuration += duration;

        if (epic.status?.toLowerCase() === 'completed') {
          onTrack++;
        } else if (new Date(epic.due_date) < now) {
          overdue++;
        } else {
          const daysRemaining = Math.ceil(
            (new Date(epic.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysRemaining <= 7) {
            atRisk++;
          } else {
            onTrack++;
          }
        }
      }
    });

    return {
      total_epics: totalEpics,
      by_status: byStatus,
      completion_stats: {
        completed: completedCount,
        in_progress: inProgressCount,
        not_started: notStartedCount,
        completion_rate: totalEpics > 0 ? (completedCount / totalEpics) * 100 : 0,
      },
      issue_distribution: issueDistribution,
      timeline_stats: {
        on_track: onTrack,
        at_risk: atRisk,
        overdue,
        average_duration_days: epicWithDates > 0 ? totalDuration / epicWithDates : 0,
      },
    };
  }

  // ==================== SPRINT STATISTICS ====================

  async getSprintStatistics(
    projectId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<SprintStatistics> {
    const whereClause: any = { project_id: projectId };

    if (startDate && endDate) {
      whereClause.start_date = Between(new Date(startDate), new Date(endDate));
    }

    const sprints = await this.sprintRepository.find({
      where: whereClause,
      relations: ['issues', 'issues.current_status'],
      order: { start_date: 'DESC' },
    });

    const totalSprints = sprints.length;

    // By Status
    const statusMap = new Map<string, number>();
    sprints.forEach((sprint) => {
      statusMap.set(sprint.status, (statusMap.get(sprint.status) || 0) + 1);
    });

    const byStatus: SprintStatusBreakdown[] = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
        percentage: totalSprints > 0 ? (count / totalSprints) * 100 : 0,
      }),
    );

    // Sprint Performance
    const sprintPerformance: SprintPerformance[] = sprints.map((sprint) => {
      const totalIssues = sprint.issues?.length || 0;
      const completedIssues = sprint.issues?.filter(
        (issue) => issue.current_status?.status_category?.toLowerCase() === 'done',
      ).length || 0;

      const totalStoryPoints = sprint.issues?.reduce(
        (sum, issue) => sum + (issue.story_points || 0),
        0,
      ) || 0;

      const completedStoryPoints = sprint.issues
        ?.filter((issue) => issue.current_status?.status_category?.toLowerCase() === 'done')
        .reduce((sum, issue) => sum + (issue.story_points || 0), 0) || 0;

      return {
        sprint_id: sprint.id,
        sprint_name: sprint.sprint_name,
        total_issues: totalIssues,
        completed_issues: completedIssues,
        completion_rate: totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0,
        total_story_points: totalStoryPoints,
        completed_story_points: completedStoryPoints,
        start_date: sprint.start_date || undefined,
        end_date: sprint.end_date || undefined,
      };
    });

    // Velocity Stats
    const completedSprints = sprints.filter(
      (sprint) => sprint.status === 'completed' || sprint.status === 'closed',
    );

    const velocityTrend: VelocityTrend[] = completedSprints.slice(0, 10).map((sprint) => {
      const totalStoryPoints = sprint.issues?.reduce(
        (sum, issue) => sum + (issue.story_points || 0),
        0,
      ) || 0;

      const completedStoryPoints = sprint.issues
        ?.filter((issue) => issue.current_status?.status_category?.toLowerCase() === 'done')
        .reduce((sum, issue) => sum + (issue.story_points || 0), 0) || 0;

      return {
        sprint_name: sprint.sprint_name,
        completed_story_points: completedStoryPoints,
        committed_story_points: totalStoryPoints,
      };
    });

    const averageVelocity = velocityTrend.length > 0
      ? velocityTrend.reduce((sum, v) => sum + v.completed_story_points, 0) / velocityTrend.length
      : 0;

    const lastSprintVelocity = velocityTrend.length > 0
      ? velocityTrend[0].completed_story_points
      : 0;

    return {
      total_sprints: totalSprints,
      by_status: byStatus,
      velocity_stats: {
        average_velocity: averageVelocity,
        last_sprint_velocity: lastSprintVelocity,
        velocity_trend: velocityTrend,
      },
      sprint_performance: sprintPerformance,
    };
  }

  // ==================== TEAM STATISTICS ====================

  async getTeamStatistics(projectId: number): Promise<TeamStatistics> {
    // Get all issues in project with assignees
    const issues = await this.issueRepository.find({
      where: { project_id: projectId },
      relations: ['assignees', 'current_status'],
    });

    // Count unique team members
    const memberSet = new Set<number>();
    const contributorMap = new Map<number, {
      name: string;
      completed: number;
      assigned: number;
    }>();

    issues.forEach((issue) => {
      issue.assignees?.forEach((assignee) => {
        memberSet.add(assignee.id);

        const existing = contributorMap.get(assignee.id) || {
          name: `${assignee.first_name} ${assignee.last_name}`,
          completed: 0,
          assigned: 0,
        };

        existing.assigned++;

        if (issue.current_status?.status_category?.toLowerCase() === 'done') {
          existing.completed++;
        }

        contributorMap.set(assignee.id, existing);
      });
    });

    // Get top contributors (sorted by completed issues)
    const topContributors: TopContributor[] = Array.from(contributorMap.entries())
      .map(([employeeId, data]) => ({
        employee_id: employeeId,
        employee_name: data.name,
        issues_completed: data.completed,
        issues_assigned: data.assigned,
      }))
      .sort((a, b) => b.issues_completed - a.issues_completed)
      .slice(0, 10);

    // Active contributors (those who have completed at least one issue)
    const activeContributors = Array.from(contributorMap.values()).filter(
      (c) => c.completed > 0,
    ).length;

    return {
      total_members: memberSet.size,
      active_contributors: activeContributors,
      top_contributors: topContributors,
    };
  }

  // ==================== ISSUE TREND STATISTICS ====================

  async getIssueTrend(
    projectId: number,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all issues created in the date range
    const issues = await this.issueRepository.find({
      where: {
        project_id: projectId,
        created_at: Between(start, end),
      },
      relations: ['current_status'],
    });

    // Group by date
    const trendMap = new Map<string, { created: number; resolved: number }>();

    // Initialize all dates in range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      trendMap.set(dateStr, { created: 0, resolved: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count created and resolved issues
    issues.forEach((issue) => {
      const createdDateStr = new Date(issue.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(createdDateStr);
      if (existing) {
        existing.created++;
      }

      if (issue.current_status?.status_category?.toLowerCase() === 'done') {
        // Ideally, we should have a resolved_at field, but using updated_at as proxy
        const resolvedDateStr = new Date(issue.updated_at).toISOString().split('T')[0];
        const resolvedData = trendMap.get(resolvedDateStr);
        if (resolvedData) {
          resolvedData.resolved++;
        }
      }
    });

    // Convert to array format with cumulative count
    let cumulative = 0;
    const trendData = Array.from(trendMap.entries()).map(([date, data]) => {
      cumulative += data.created - data.resolved;
      return {
        date,
        created: data.created,
        resolved: data.resolved,
        cumulative,
      };
    });

    return trendData;
  }
}