import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../database/entities/Permission.entity';
import { Role } from '../database/entities/Role.entity';
import { RolePermission } from '../database/entities/RolePermission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, RolePermission])],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}

