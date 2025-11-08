import { Module } from '@nestjs/common';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestController } from './leave-request.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from '../database/entities/LeaveRequest.entity';
import { Employee } from '../database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, Employee])],
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}

