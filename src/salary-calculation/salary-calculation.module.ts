import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WorkScheduleSettings } from '../database/entities/WorkScheduleSettings.entity';
import { SalarySettings } from '../database/entities/SalarySettings.entity';
import { HrRequest } from '../database/entities/HrRequest.entity';
import { EmployeeSalary } from '../database/entities/EmployeeSalary.entity';
import { Attendance } from '../database/entities/Attendance.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { WorkScheduleService } from './work-schedule.service';
import { WorkScheduleController } from './work-schedule.controller';
import { SalarySettingsService } from './salary-settings.service';
import { SalarySettingsController } from './salary-settings.controller';
import { SalaryCalculationService } from './salary-calculation.service';
import { SalaryCalculationController } from './salary-calculation.controller';
import { SalarySchedulerService } from './salary-scheduler.service';
import { SalaryCalculationProcessor, SALARY_CALCULATION_QUEUE } from './salary-calculation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkScheduleSettings,
      SalarySettings,
      HrRequest,
      EmployeeSalary,
      Attendance,
      Employee,
      Role,
    ]),
    BullModule.registerQueue({
      name: SALARY_CALCULATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    WorkScheduleService,
    SalarySettingsService,
    SalaryCalculationService, // Must be before SalaryCalculationProcessor
    SalarySchedulerService,
    SalaryCalculationProcessor,
  ],
  controllers: [
    WorkScheduleController,
    SalarySettingsController,
    SalaryCalculationController,
  ],
  exports: [
    WorkScheduleService,
    SalarySettingsService,
    SalaryCalculationService,
  ],
})
export class SalaryCalculationModule {}

