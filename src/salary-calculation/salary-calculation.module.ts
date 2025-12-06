import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkScheduleSettings } from '../database/entities/WorkScheduleSettings.entity';
import { SalarySettings } from '../database/entities/SalarySettings.entity';
import { OvertimeRequest } from '../database/entities/OvertimeRequest.entity';
import { LateEarlyRequest } from '../database/entities/LateEarlyRequest.entity';
import { EmployeeSalary } from '../database/entities/EmployeeSalary.entity';
import { Attendance } from '../database/entities/Attendance.entity';
import { LeaveRequest } from '../database/entities/LeaveRequest.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { WorkScheduleService } from './work-schedule.service';
import { WorkScheduleController } from './work-schedule.controller';
import { SalarySettingsService } from './salary-settings.service';
import { SalarySettingsController } from './salary-settings.controller';
import { OvertimeRequestService } from './overtime-request.service';
import { OvertimeRequestController } from './overtime-request.controller';
import { LateEarlyRequestService } from './late-early-request.service';
import { LateEarlyRequestController } from './late-early-request.controller';
import { SalaryCalculationService } from './salary-calculation.service';
import { SalaryCalculationController } from './salary-calculation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkScheduleSettings,
      SalarySettings,
      OvertimeRequest,
      LateEarlyRequest,
      EmployeeSalary,
      Attendance,
      LeaveRequest,
      Employee,
      Role,
    ]),
  ],
  providers: [
    WorkScheduleService,
    SalarySettingsService,
    OvertimeRequestService,
    LateEarlyRequestService,
    SalaryCalculationService,
  ],
  controllers: [
    WorkScheduleController,
    SalarySettingsController,
    OvertimeRequestController,
    LateEarlyRequestController,
    SalaryCalculationController,
  ],
  exports: [
    WorkScheduleService,
    SalarySettingsService,
    OvertimeRequestService,
    LateEarlyRequestService,
    SalaryCalculationService,
  ],
})
export class SalaryCalculationModule {}

