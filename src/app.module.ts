import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project-module/project/project.module';
import { IssueModule } from './project-module/issue-module/issue/issue.module';
import { IssueCommentModule } from './project-module/issue-module/comment/issue-comment.module';
import { EmployeeModule } from './employee/employee.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { PositionModule } from './position/position.module';
import { DepartmentModule } from './department/department.module';
import { EmployeePositionModule } from './employee-position/employee-position.module';
import { AttendanceModule } from './attendance/attendance.module';
import { EmployeeSalaryModule } from './employee-salary/employee-salary.module';
import { LeaveRequestModule } from './leave-request/leave-request.module';
import { FileModule } from './file/file.module';
import { ReportModule } from './report/report.module';
import { SeedService } from './database/seed.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './database/entities/Employee.entity';
import { Role } from './database/entities/Role.entity';
import { Permission } from './database/entities/Permission.entity';
import { EmployeeRoleAssignment } from './database/entities/EmployeeRoleAssignment.entity';
import { RolePermission } from './database/entities/RolePermission.entity';
import { RefreshToken } from './database/entities/RefreshToken.entity';
import { PasswordResetToken } from './database/entities/PasswordResetToken.entity';
import { AuditLog } from './database/entities/AuditLog.entity';
import { Project } from './database/entities/project-module/Project.entity';
import { Epic, Issue, IssueChangeHistory, IssueComment, IssueLink, IssueType } from './database/entities/project-module/Issue.entity';
import { Position } from './database/entities/Position.entity';
import { Department } from './database/entities/Department.entity';
import { EmployeePosition } from './database/entities/EmployeePosition.entity';
import { Attendance } from './database/entities/Attendance.entity';
import { EmployeeSalary } from './database/entities/EmployeeSalary.entity';
import { LeaveRequest } from './database/entities/LeaveRequest.entity';
import { File } from './database/entities/File.entity';
import { Report } from './database/entities/Report.entity';
import { WorkflowSeederService } from './database/seeders/project-module/workflow.seeder';
import {
  Workflow,
  WorkflowScheme,
  WorkflowStatus,
  WorkflowSchemeMapping,
} from './database/entities/project-module/Workflow.entity';
import { EpicModule } from './project-module/epic/epic.module';
import { SprintModule } from './project-module/sprint/sprint.module';
import { Sprint, SprintIssue } from './database/entities/project-module/Sprint.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        Employee,
        Role,
        Permission,
        EmployeeRoleAssignment,
        RolePermission,
        RefreshToken,
        PasswordResetToken,
        AuditLog,
        Project,
        Issue,
        IssueLink,
        IssueType,
        Sprint,
        SprintIssue,
        IssueChangeHistory,
        Workflow,
        WorkflowScheme,
        WorkflowStatus,
        WorkflowSchemeMapping,
        Epic,
        IssueComment,
        Position,
        Department,
        EmployeePosition,
        Attendance,
        EmployeeSalary,
        LeaveRequest,
        File,
        Report,
      ],
      synchronize: false,
      schema: 'public',
    }),
    AuthModule,
    TypeOrmModule.forFeature([
      Employee,
      Role,
      Permission,
      EmployeeRoleAssignment,
      RolePermission,
      RefreshToken,
      PasswordResetToken,
      AuditLog,
      Project,
      Issue,
      IssueLink,
      IssueType,
      Sprint,
      SprintIssue,
      IssueChangeHistory,
      Workflow,
      WorkflowScheme,
      WorkflowStatus,
      WorkflowSchemeMapping,
      Epic,
      IssueComment,
      Position,
      Department,
      EmployeePosition,
      Attendance,
      EmployeeSalary,
      LeaveRequest,
      File,
      Report,
    ]),
    ProjectModule,
    EpicModule,
    IssueModule,
    SprintModule,
    IssueCommentModule,
    EmployeeModule,
    RoleModule,
    PermissionModule,
    PositionModule,
    DepartmentModule,
    EmployeePositionModule,
    AttendanceModule,
    EmployeeSalaryModule,
    LeaveRequestModule,
    FileModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService, WorkflowSeederService],
})
export class AppModule {}
