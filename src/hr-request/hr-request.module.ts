import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrRequest } from '../database/entities/HrRequest.entity';
import { Employee } from '../database/entities/Employee.entity';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';
import { HrRequestService } from './hr-request.service';
import { HrRequestController } from './hr-request.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HrRequest, Employee, EmployeePosition])],
  controllers: [HrRequestController],
  providers: [HrRequestService],
  exports: [HrRequestService],
})
export class HrRequestModule {}

