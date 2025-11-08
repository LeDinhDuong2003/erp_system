import { Module } from '@nestjs/common';
import { EmployeePositionService } from './employee-position.service';
import { EmployeePositionController } from './employee-position.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Department } from '../database/entities/Department.entity';
import { Position } from '../database/entities/Position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeePosition,
      Employee,
      Department,
      Position,
    ]),
  ],
  controllers: [EmployeePositionController],
  providers: [EmployeePositionService],
  exports: [EmployeePositionService],
})
export class EmployeePositionModule {}

