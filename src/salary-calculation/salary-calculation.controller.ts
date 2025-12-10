import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SalaryCalculationService } from './salary-calculation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('salary-calculation')
@Controller('salary-calculation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SalaryCalculationController {
  constructor(private readonly salaryCalculationService: SalaryCalculationService) {}

  @Post('calculate/:employeeId')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Calculate salary for an employee (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Salary calculated successfully' })
  async calculate(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() body: { year: number; month: number },
  ) {
    return this.salaryCalculationService.calculateSalary(employeeId, body.year, body.month);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get all salaries for an employee' })
  @ApiResponse({ status: 200, description: 'Salaries retrieved successfully' })
  async getEmployeeSalaries(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.salaryCalculationService.getEmployeeSalaries(employeeId);
  }

  @Get('employee/:employeeId/month')
  @ApiOperation({ summary: 'Get salary for an employee for a specific month' })
  @ApiResponse({ status: 200, description: 'Salary retrieved successfully' })
  async getSalary(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.salaryCalculationService.getSalary(employeeId, year, month);
  }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve salary (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Salary approved successfully' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.salaryCalculationService.approveSalary(id);
  }

  @Put('approve-all')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve all salaries for a specific month (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Salaries approved successfully' })
  async approveAll(@Body() body: { year: number; month: number }) {
    return this.salaryCalculationService.approveAllSalaries(body.year, body.month);
  }

  @Put(':id/mark-paid')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Mark salary as paid (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Salary marked as paid successfully' })
  async markAsPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pay_date: string; payment_method: string },
  ) {
    return this.salaryCalculationService.markAsPaid(
      id,
      new Date(body.pay_date),
      body.payment_method,
    );
  }

  @Post('calculate-all')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Calculate salary for all employees (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Salaries calculated successfully' })
  async calculateAll(@Body() body: { year: number; month: number }) {
    return this.salaryCalculationService.calculateAllEmployees(body.year, body.month);
  }

  @Get('month')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all salaries for a specific month (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Salaries retrieved successfully' })
  async getSalariesByMonth(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.salaryCalculationService.getSalariesByMonth(year, month);
  }
}

