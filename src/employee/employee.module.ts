import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Role, EmployeeRoleAssignment])],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}

