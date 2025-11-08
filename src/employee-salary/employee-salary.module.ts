import { Module } from '@nestjs/common';
import { EmployeeSalaryService } from './employee-salary.service';
import { EmployeeSalaryController } from './employee-salary.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeSalary } from '../database/entities/EmployeeSalary.entity';
import { Employee } from '../database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeSalary, Employee])],
  controllers: [EmployeeSalaryController],
  providers: [EmployeeSalaryService],
  exports: [EmployeeSalaryService],
})
export class EmployeeSalaryModule {}

