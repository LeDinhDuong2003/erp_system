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
import { Issue, IssueComment } from './database/entities/project-module/Issue.entity';

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
        IssueComment,
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
      IssueComment,
    ]),
    ProjectModule,
    IssueModule,
    IssueCommentModule,
    EmployeeModule,
    RoleModule,
    PermissionModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
