import { Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EmployeeRoleAssignment } from './EmployeeRoleAssignment.entity';
import { PasswordResetToken } from './PasswordResetToken.entity';
import { RefreshToken } from './RefreshToken.entity';
import { AuditLog } from './AuditLog.entity';
import { ProjectRoleAssignment } from './project-module/Permission.entity';
import { Project } from './project-module/Project.entity';
import { Issue, IssueChangeHistory, IssueComment } from './project-module/Issue.entity';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum EmployeeRoleEnum {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  VIEWER = 'VIEWER',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

@Entity({ name: 'employee' })
export class Employee {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  employee_code!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'text', nullable: true })
  password_hash!: string | null;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name!: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ type: 'date', nullable: true })
  dob!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  national_id!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone!: string | null;

  @Column({ type: 'enum', enum: EmployeeRoleEnum, nullable: true })
  role!: EmployeeRoleEnum | null;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'int', default: 0 })
  failed_login_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  locked_until!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @OneToMany(() => EmployeeRoleAssignment, (era) => era.employee)
  employee_role_assignments!: EmployeeRoleAssignment[];

  @OneToMany(() => PasswordResetToken, (prt) => prt.employee)
  password_reset_tokens!: PasswordResetToken[];

  @OneToMany(() => RefreshToken, (rt) => rt.employee)
  refresh_tokens!: RefreshToken[];

  @OneToMany(() => AuditLog, (al) => al.employee)
  audit_logs!: AuditLog[];

  // @OneToMany(() => ProjectRoleAssignment, (pra) => pra.employee)
  project_role_assignments!: ProjectRoleAssignment[];

  // @OneToMany(() => ProjectRoleAssignment, (pra) => pra.assigned_by_employee)
  assigned_roles!: ProjectRoleAssignment[];

  @OneToMany(() => Project, (project) => project.lead_employee)
  led_projects!: Project[];

  @OneToMany(() => Issue, (issue) => issue.reporter)
  reported_issues!: Issue[];

  // @OneToMany(() => IssueComment, (comment) => comment.employee)
  issue_comments!: IssueComment[];

  // @OneToMany(() => IssueChangeHistory, (history) => history.changer_employee)
  issue_changes!: IssueChangeHistory[];

  @ManyToMany(() => Issue, (issue) => issue.assignees)
  assigned_issues!: Issue[];

  @ManyToMany(() => Issue, (issue) => issue.watchers)
  watched_issues!: Issue[];
}


