import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Epic, Issue } from './Issue.entity';
import { Employee } from '../Employee.entity';
import { PermissionScheme, ProjectRoleAssignment } from './Permission.entity';
import { Sprint } from './Sprint.entity';
import { WorkflowScheme } from './Workflow.entity';
import { NotificationScheme } from './Notification.entity';

// -------------------- Project Entity --------------------
@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  project_key!: string;

  @Column()
  project_name!: string;

  @Column()
  lead_employee_id!: number;

  @Column()
  permission_scheme_id!: number;

  @Column()
  notification_scheme_id!: number;

  @Column()
  workflow_scheme_id!: number;

  @ManyToOne(() => Employee, (employee) => employee.led_projects)
  @JoinColumn({ name: 'lead_employee_id' })
  lead_employee!: Employee;

  // @ManyToOne(() => PermissionScheme, (scheme) => scheme.projects)
  // @JoinColumn({ name: 'permission_scheme_id' })
  permission_scheme!: PermissionScheme;

  // @ManyToOne(() => NotificationScheme, (scheme) => scheme.projects)
  // @JoinColumn({ name: 'notification_scheme_id' })
  notification_scheme!: NotificationScheme;

  // @ManyToOne(() => WorkflowScheme, (scheme) => scheme.projects)
  // @JoinColumn({ name: 'workflow_scheme_id' })
  workflow_scheme!: WorkflowScheme;

  // @OneToMany(() => ProjectRoleAssignment, (pra) => pra.project)
  role_assignments!: ProjectRoleAssignment[];

  @OneToMany(() => Issue, (issue) => issue.project)
  issues!: Issue[];

  // @OneToMany(() => Epic, (epic) => epic.project)
  epics!: Epic[];

  // @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprints!: Sprint[];
}

