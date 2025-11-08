import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../database/entities/Report.entity';
import { Employee } from '../database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Employee])],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}

