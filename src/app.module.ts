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
import { AssetManagementModule } from './asset-management/asset-management.module';
import { Asset } from './database/assetmanagement/asset.entity';
import { Category } from './database/assetmanagement/category.entity';

// THÊM DÒNG NÀY – ĐÚNG ĐƯỜNG DẪN TỚI FILE MODULE BẠN VỪA TẠO
import { AssetHandoverModule } from './asset-handover/assethandover.module'
import { AssetRequestModule } from './asset-request/asset-request.module';
// Nếu bạn còn entity Assignment thì thêm vào đây luôn cho chắc
import { Assignment } from './database/assethandover/assignment.entity';
import { Request } from './database/assetrequest/request.entity';
import { Notification } from './database/assetrequest/notification.entity';
import { Supplier } from './database/assetrequest/supplier.entity';
import { WorkflowSeederService } from './database/seeders/project-module/workflow.seeder';
import { PermissionSeederService } from './database/seeders/project-module/permission.seeder';
import {
  Workflow,
  WorkflowScheme,
  WorkflowStatus,
  WorkflowSchemeMapping,
} from './database/entities/project-module/Workflow.entity';
import { EpicModule } from './project-module/epic/epic.module';
import { SprintModule } from './project-module/sprint/sprint.module';
import { Sprint, SprintIssue } from './database/entities/project-module/Sprint.entity';
import { PermissionScheme, ProjectPermission, ProjectRole, ProjectRoleAssignment } from './database/entities/project-module/Permission.entity';
import { TeamModule } from './project-module/team/team.module';
import { ProjectPermissionModule } from './project-module/permission-system/project-permission.module';
import { ProjectRoleModule } from './project-module/project-role-management/project-role.module';
import { NotificationScheme, ProjectNotification } from './database/entities/project-module/Notification.entity';
import { NotificationSeederService } from './database/seeders/project-module/notification.seeder';
import { NotificationModule } from './project-module/notification/notification.module';
import { StatisticsModule } from './project-module/statistics/statistics.module';

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
        PermissionScheme,
        ProjectRole,
        ProjectPermission,
        ProjectRoleAssignment,
        Epic,
        IssueComment,
        ProjectNotification,
        NotificationScheme,
        Position,
        Department,
        EmployeePosition,
        Attendance,
        EmployeeSalary,
        LeaveRequest,
        File,
        Report,
        Asset,
        Category,
        Assignment,
        Request,
        Notification,
        Supplier, // THÊM DÒNG NÀY NẾU CHƯA CÓ
      ],
      synchronize: false,
      schema: 'public',
    }),
    AssetManagementModule,
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
      PermissionScheme,
      ProjectRole,
      ProjectPermission,
      ProjectRoleAssignment,
      Epic,
      IssueComment,
      ProjectNotification,
      NotificationScheme,
      Position,
      Department,
      EmployeePosition,
      Attendance,
      EmployeeSalary,
      LeaveRequest,
      File,
      Report,
      Asset,
      Category,
      Assignment, // THÊM NẾU CHƯA CÓ
    ]),
    ProjectModule,
    StatisticsModule,
    EpicModule,
    IssueModule,
    SprintModule,
    IssueCommentModule,
    ProjectPermissionModule,
    ProjectRoleModule,
    NotificationModule,
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
    TeamModule,

    // DÒNG QUAN TRỌNG NHẤT – THÊM VÀO ĐÂY
    AssetHandoverModule,
    AssetRequestModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService, WorkflowSeederService, PermissionSeederService, NotificationSeederService],
})
export class AppModule {}