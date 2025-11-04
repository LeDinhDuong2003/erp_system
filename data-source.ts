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
  ],
  migrations: ['src/migration/**/*.ts'],
});


