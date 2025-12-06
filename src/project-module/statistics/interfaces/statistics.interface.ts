// Issue Statistics Response
export interface IssueStatistics {
    total_issues: number;
    by_status: StatusBreakdown[];
    by_type: TypeBreakdown[];
    by_assignee: AssigneeBreakdown[];
    by_priority?: PriorityBreakdown[];
    resolution_stats: ResolutionStats;
    time_stats: TimeStats;
    trend_data?: TrendData[];
  }
  
  export interface StatusBreakdown {
    status_id: number;
    status_name: string;
    count: number;
    percentage: number;
  }
  
  export interface TypeBreakdown {
    issue_type_id: number;
    type_name: string;
    count: number;
    percentage: number;
  }
  
  export interface AssigneeBreakdown {
    employee_id: number;
    employee_name: string;
    count: number;
    completed: number;
    in_progress: number;
  }
  
  export interface PriorityBreakdown {
    priority: string;
    count: number;
    percentage: number;
  }
  
  export interface ResolutionStats {
    resolved: number;
    unresolved: number;
    resolution_rate: number;
  }
  
  export interface TimeStats {
    total_story_points: number;
    average_story_points: number;
    total_estimated_hours: number;
    total_spent_hours: number;
  }
  
  export interface TrendData {
    date: string;
    created: number;
    resolved: number;
    cumulative: number;
  }
  
  // Epic Statistics Response
  export interface EpicStatistics {
    total_epics: number;
    by_status: EpicStatusBreakdown[];
    completion_stats: EpicCompletionStats;
    issue_distribution: EpicIssueDistribution[];
    timeline_stats: EpicTimelineStats;
  }
  
  export interface EpicStatusBreakdown {
    status: string;
    count: number;
    percentage: number;
  }
  
  export interface EpicCompletionStats {
    completed: number;
    in_progress: number;
    not_started: number;
    completion_rate: number;
  }
  
  export interface EpicIssueDistribution {
    epic_id: number;
    epic_name: string;
    total_issues: number;
    completed_issues: number;
    progress_percentage: number;
  }
  
  export interface EpicTimelineStats {
    on_track: number;
    at_risk: number;
    overdue: number;
    average_duration_days: number;
  }
  
  // Sprint Statistics Response
  export interface SprintStatistics {
    total_sprints: number;
    by_status: SprintStatusBreakdown[];
    velocity_stats: VelocityStats;
    sprint_performance: SprintPerformance[];
    burndown_data?: BurndownData;
  }
  
  export interface SprintStatusBreakdown {
    status: string;
    count: number;
    percentage: number;
  }
  
  export interface VelocityStats {
    average_velocity: number;
    last_sprint_velocity: number;
    velocity_trend: VelocityTrend[];
  }
  
  export interface VelocityTrend {
    sprint_name: string;
    completed_story_points: number;
    committed_story_points: number;
  }
  
  export interface SprintPerformance {
    sprint_id: number;
    sprint_name: string;
    total_issues: number;
    completed_issues: number;
    completion_rate: number;
    total_story_points: number;
    completed_story_points: number;
    start_date?: Date;
    end_date?: Date;
  }
  
  export interface BurndownData {
    ideal: number[];
    actual: number[];
    labels: string[];
  }
  
  // Overall Project Statistics
  export interface ProjectOverallStatistics {
    project_id: number;
    project_name: string;
    project_key: string;
    issue_stats: IssueStatistics;
    epic_stats: EpicStatistics;
    sprint_stats: SprintStatistics;
    team_stats: TeamStatistics;
  }
  
  export interface TeamStatistics {
    total_members: number;
    active_contributors: number;
    top_contributors: TopContributor[];
  }
  
  export interface TopContributor {
    employee_id: number;
    employee_name: string;
    issues_completed: number;
    issues_assigned: number;
  }