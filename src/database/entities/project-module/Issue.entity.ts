import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Project } from './Project.entity';
import { Employee } from '../Employee.entity';
import { WorkflowSchemeMapping, WorkflowStatus } from './Workflow.entity';
import { Sprint } from './Sprint.entity';



// -------------------- Issue Type Entity --------------------
@Entity({ name: 'issue_types' })
export class IssueType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  type_name!: string;

  // @OneToMany(() => Issue, (issue) => issue.issue_type)
  issues!: Issue[];

  // @OneToMany(() => WorkflowSchemeMapping, (mapping) => mapping.issue_type)
  workflow_mappings!: WorkflowSchemeMapping[];
}

// -------------------- Epic Entity --------------------
@Entity({ name: 'epics' })
export class Epic {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  project_id!: number;

  @Column()
  epic_name!: string;

  @Column({ type: 'text', nullable: true })
  goal!: string | null;

  @Column({ type: 'varchar', nullable: true })
  status!: string | null;

  @Column({ type: 'date', nullable: true })
  start_date!: Date | null;

  @Column({ type: 'date', nullable: true })
  due_date!: Date | null;

  @ManyToOne(() => Project, (project) => project.epics)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => Issue, (issue) => issue.epic_link)
  issues!: Issue[];
}

// -------------------- Issue Entity (Updated) --------------------
@Entity({ name: 'issues' })
export class Issue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  project_id!: number;

  @Column()
  issue_type_id!: number;

  @Column({ type: 'integer', default: 0 })
  order_index!: number;

  @Column()
  summary!: string;

  @Column()
  issue_code!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column()
  current_status_id!: number;

  @Column()
  reporter_id!: number;

  @Column({ type: 'integer', nullable: true })
  epic_link_id!: number | null;

  @Column({ type: 'integer', nullable: true })
  story_points!: number | null;

  @Column({ type: 'integer', nullable: true })
  original_estimate_seconds!: number | null;

  @Column({ type: 'integer', nullable: true })
  time_spent_seconds!: number | null;

  @Column({ type: 'varchar', nullable: true })
  resolution!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne(() => Project, (project) => project.issues)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => IssueType, (type) => type.issues)
  @JoinColumn({ name: 'issue_type_id' })
  issue_type!: IssueType;

  @ManyToOne(() => WorkflowStatus, (status) => status.issues)
  @JoinColumn({ name: 'current_status_id' })
  current_status!: WorkflowStatus;

  @ManyToOne(() => Employee, (employee) => employee.reported_issues)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: Employee;

  @ManyToOne(() => Epic, (epic) => epic.issues)
  @JoinColumn({ name: 'epic_link_id' })
  epic_link!: Epic | null;

  @ManyToMany(() => Employee, (employee) => employee.assigned_issues)
  @JoinTable({
    name: 'issue_assignees',
    joinColumn: { name: 'issue_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' },
  })
  assignees!: Employee[];

  @ManyToMany(() => Employee, (employee) => employee.watched_issues)
  @JoinTable({
    name: 'issue_watchers',
    joinColumn: { name: 'issue_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' },
  })
  watchers!: Employee[];

  // @OneToMany(() => IssueLink, (link) => link.source_issue)
  source_links!: IssueLink[];

  // @OneToMany(() => IssueLink, (link) => link.target_issue)
  target_links!: IssueLink[];

  // @OneToMany(() => IssueComment, (comment) => comment.issue)
  comments!: IssueComment[];

  // @OneToMany(() => IssueChangeHistory, (history) => history.issue)
  change_histories!: IssueChangeHistory[];

  @Column({ nullable: true })
  sprint_id!: number | null;

  @ManyToOne(() => Sprint, (sprint) => sprint.issues)
  @JoinColumn({ name: 'sprint_id' })
  sprint!: Sprint | null;
}



// -------------------- Issue Link Entity --------------------
@Entity({ name: 'issue_links' })
export class IssueLink {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  source_issue_id!: number;

  @Column()
  target_issue_id!: number;

  @Column()
  link_type!: string;

  @ManyToOne(() => Issue, (issue) => issue.source_links)
  @JoinColumn({ name: 'source_issue_id' })
  source_issue!: Issue;

  @ManyToOne(() => Issue, (issue) => issue.target_links)
  @JoinColumn({ name: 'target_issue_id' })
  target_issue!: Issue;
}

// -------------------- Issue Comment Entity --------------------
@Entity({ name: 'issue_comments' })
export class IssueComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  issue_id!: number;

  @Column()
  employee_id!: number;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne(() => Issue, (issue) => issue.comments)
  @JoinColumn({ name: 'issue_id' })
  issue!: Issue;

  @ManyToOne(() => Employee, (employee) => employee.issue_comments)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}

// -------------------- Issue Change History Entity --------------------
@Entity({ name: 'issue_change_histories' })
export class IssueChangeHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  issue_id!: number;

  @Column()
  changer_employee_id!: number;

  @Column({ type: 'timestamp' })
  change_date!: Date;

  @Column()
  field_name!: string;

  @Column({ type: 'varchar', nullable: true })
  old_value!: string | null;

  @Column({ type: 'varchar', nullable: true })
  new_value!: string | null;

  @ManyToOne(() => Issue, (issue) => issue.change_histories)
  @JoinColumn({ name: 'issue_id' })
  issue!: Issue;

  @ManyToOne(() => Employee, (employee) => employee.issue_changes)
  @JoinColumn({ name: 'changer_employee_id' })
  changer_employee!: Employee;
}