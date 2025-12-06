import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceVerificationService } from './attendance-verification.service';
import { S3Service } from './s3.service';
import { SalaryCalculationModule } from '../salary-calculation/salary-calculation.module';
import { AttendanceController } from './attendance.controller';
import { Attendance } from '../database/entities/Attendance.entity';
import { Employee } from '../database/entities/Employee.entity';
import { EmployeeDevice } from '../database/entities/EmployeeDevice.entity';
import { AttendanceChallenge } from '../database/entities/AttendanceChallenge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      Employee,
      EmployeeDevice,
      AttendanceChallenge,
    ]),
    SalaryCalculationModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceVerificationService, S3Service],
  exports: [AttendanceService, AttendanceVerificationService],
})
export class AttendanceModule {}
