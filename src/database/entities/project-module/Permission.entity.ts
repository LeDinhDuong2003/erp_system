import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from '../Employee.entity';
import { Project } from './Project.entity';

// -------------------- Permission Scheme Entity --------------------
@Entity({ name: 'permission_schemes' })
export class PermissionScheme {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  scheme_name!: string;

  @Column({ type: 'varchar', nullable: true })
  scheme_description!: string | null;

  @Column({ default: false })
  is_default!: boolean;

  @OneToMany(() => ProjectPermission, (permission) => permission.permission_scheme)
  permissions!: ProjectPermission[];

  @OneToMany(() => Project, (project) => project.permission_scheme)
  projects!: Project[];
}

// -------------------- Project Role Entity --------------------
@Entity({ name: 'project_roles' })
export class ProjectRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  role_name!: string;

  @Column({ type: 'varchar', nullable: true })
  role_description!: string | null;

  @Column({ default: false })
  is_default!: boolean;

  @Column({ nullable: true, type: 'text' })
  permission_scheme_id: number;

  @CreateDateColumn({ nullable: true, type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => ProjectPermission, (permission) => permission.project_role)
  permissions!: ProjectPermission[];

  @OneToMany(() => ProjectRoleAssignment, (pra) => pra.project_role)
  role_assignments!: ProjectRoleAssignment[];

  @ManyToOne(() => PermissionScheme, (scheme) => scheme.permissions)
  @JoinColumn({ name: 'permission_scheme_id' })
  permission_scheme!: PermissionScheme;
}

// -------------------- Project Permission Entity (renamed from Permission) --------------------
export enum PermissionScope {
  EMPLOYEE = 'EMPLOYEE',
  GROUP = 'GROUP',
  ROLE = 'ROLE',
  REPORTER = 'REPORTER',
  ASSIGNEE = 'ASSIGNEE',
}

@Entity({ name: 'project_permissions' })
export class ProjectPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  permission_scheme_id!: number;

  @Column()
  action_key!: string;

  @Column({ type: 'enum', enum: PermissionScope })
  recipient_type!: PermissionScope;

  @Column({ type: 'integer', nullable: true })
  project_role_id!: number | null;

  @Column({ type: 'integer', nullable: true })
  specific_employee_id!: number | null;

  @Column({ type: 'varchar', nullable: true })
  group_name!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne(() => PermissionScheme, (scheme) => scheme.permissions)
  @JoinColumn({ name: 'permission_scheme_id' })
  permission_scheme!: PermissionScheme;

  @ManyToOne(() => ProjectRole, (role) => role.permissions)
  @JoinColumn({ name: 'project_role_id' })
  project_role!: ProjectRole | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'specific_employee_id' })
  specific_employee!: Employee | null;
}

// -------------------- Project Role Assignment Entity --------------------
@Entity({ name: 'project_role_assignments' })
@Index(['employee_id', 'project_id'], { unique: true })
export class ProjectRoleAssignment {
  @Column({ primary: true })
  employee_id!: number;

  @Column({ primary: true })
  project_id!: number;

  @Column()
  project_role_id!: number;

  @Column()
  assigned_by_employee_id!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assigned_at!: Date;

  @ManyToOne(() => Employee, (employee) => employee.project_role_assignments)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Project, (project) => project.role_assignments)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => ProjectRole, (role) => role.role_assignments)
  @JoinColumn({ name: 'project_role_id' })
  project_role!: ProjectRole;

  @ManyToOne(() => Employee, (employee) => employee.assigned_roles)
  @JoinColumn({ name: 'assigned_by_employee_id' })
  assigned_by_employee!: Employee;
}