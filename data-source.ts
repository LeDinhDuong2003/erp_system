// data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

// Employee & Auth entities
import { Employee } from './src/database/entities/Employee.entity';
import { Role } from './src/database/entities/Role.entity';
import { Permission } from './src/database/entities/Permission.entity';
import { EmployeeRoleAssignment } from './src/database/entities/EmployeeRoleAssignment.entity';
import { RolePermission } from './src/database/entities/RolePermission.entity';
import { PasswordResetToken } from './src/database/entities/PasswordResetToken.entity';
import { RefreshToken } from './src/database/entities/RefreshToken.entity';
import { AuditLog } from './src/database/entities/AuditLog.entity';

// Project entities (từ Project.entity.ts)
import { 
  Project,
} from './src/database/entities/project-module/Project.entity';

import { 
  NotificationScheme,
  Notification,
} from './src/database/entities/project-module/Notification.entity';

// Issue entities (từ Issue.entity.ts)
import {
  Epic,
  Issue,
  IssueLink,
  IssueComment,
  IssueChangeHistory,
  IssueType,
} from './src/database/entities/project-module/Issue.entity';

import {
  Workflow,
  WorkflowStatus,
  WorkflowSchemeMapping,
  WorkflowScheme,
} from './src/database/entities/project-module/Workflow.entity';

// Sprint entities (từ Sprint.entity.ts)
import {
  Sprint,
  SprintIssue,
} from './src/database/entities/project-module/Sprint.entity';

// Permission entities (từ Permission.entity.ts)
import {
  PermissionScheme,
  ProjectRole,
  ProjectPermission,
  ProjectRoleAssignment,
} from './src/database/entities/project-module/Permission.entity';
import { Position } from './src/database/entities/Position.entity';
import { Department } from './src/database/entities/Department.entity';
import { EmployeePosition } from './src/database/entities/EmployeePosition.entity';
import { Attendance } from './src/database/entities/Attendance.entity';
import { EmployeeSalary } from './src/database/entities/EmployeeSalary.entity';
import { LeaveRequest } from './src/database/entities/LeaveRequest.entity';
import { File } from './src/database/entities/File.entity';
import { Report } from './src/database/entities/Report.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    // Auth & Employee
    Employee,
    Role,
    Permission,
    EmployeeRoleAssignment,
    RolePermission,
    PasswordResetToken,
    RefreshToken,
    AuditLog,
    
    // Project Module - Projects
    Project,

    // Project Module - Notifications
    NotificationScheme,
    Notification,
    
    // Project Module - Issues
    IssueType,
    Epic,
    Issue,
    IssueLink,
    IssueComment,
    IssueChangeHistory,

    // Project Module - Workflows
    Workflow,
    WorkflowStatus,
    WorkflowSchemeMapping,
    WorkflowScheme,
    
    // Project Module - Sprints
    Sprint,
    SprintIssue,
    
    // Project Module - Permissions
    PermissionScheme,
    ProjectRole,
    ProjectPermission,
    ProjectRoleAssignment,
    Position,
    Department,
    EmployeePosition,
    Attendance,
    EmployeeSalary,
    LeaveRequest,
    File,
    Report,
  ],
  migrations: ['src/migration/**/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
