import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../database/entities/Role.entity';
import { Permission } from '../database/entities/Permission.entity';
import { RolePermission } from '../database/entities/RolePermission.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, EmployeeRoleAssignment])],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}

