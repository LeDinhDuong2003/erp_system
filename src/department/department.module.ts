import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../database/entities/Department.entity';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';
import { Employee } from '../database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, EmployeePosition, Employee])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}

