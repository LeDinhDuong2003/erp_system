import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';
import { EmailService } from '../common/services/email.service';
import { SalaryCalculationModule } from '../salary-calculation/salary-calculation.module';
import { S3Service } from '../attendance/s3.service';
import { RedisService } from '../common/services/redis.service';
import { AUTH_EMAIL_QUEUE } from '../auth/auth-email.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Role, EmployeeRoleAssignment]),
    forwardRef(() => SalaryCalculationModule),
    BullModule.registerQueue({
      name: AUTH_EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmailService, S3Service, RedisService],
  exports: [EmployeeService],
})
export class EmployeeModule {}

