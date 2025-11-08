import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Employee } from './src/database/entities/Employee.entity';
import { Role } from './src/database/entities/Role.entity';
import { Permission } from './src/database/entities/Permission.entity';
import { EmployeeRoleAssignment } from './src/database/entities/EmployeeRoleAssignment.entity';
import { RolePermission } from './src/database/entities/RolePermission.entity';
import { PasswordResetToken } from './src/database/entities/PasswordResetToken.entity';
import { RefreshToken } from './src/database/entities/RefreshToken.entity';
import { AuditLog } from './src/database/entities/AuditLog.entity';
import { Project } from './src/database/entities/Project.entity';
import { Position } from './src/database/entities/Position.entity';
import { Department } from './src/database/entities/Department.entity';
import { EmployeePosition } from './src/database/entities/EmployeePosition.entity';
import { Attendance } from './src/database/entities/Attendance.entity';
import { EmployeeSalary } from './src/database/entities/EmployeeSalary.entity';
import { LeaveRequest } from './src/database/entities/LeaveRequest.entity';
import { File } from './src/database/entities/File.entity';
import { Report } from './src/database/entities/Report.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Employee,
    Role,
    Permission,
    EmployeeRoleAssignment,
    RolePermission,
    PasswordResetToken,
    RefreshToken,
    AuditLog,
    Project,
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
});


