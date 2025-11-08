import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { EmployeeSalaryService } from './employee-salary.service';
import { CreateEmployeeSalaryDto } from './dto/create-employee-salary.dto';
import { UpdateEmployeeSalaryDto } from './dto/update-employee-salary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SalaryStatus } from '../database/entities/EmployeeSalary.entity';

@Controller('employee-salary')
@UseGuards(JwtAuthGuard)
export class EmployeeSalaryController {
  constructor(private readonly employeeSalaryService: EmployeeSalaryService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  create(@Body() createEmployeeSalaryDto: CreateEmployeeSalaryDto) {
    return this.employeeSalaryService.create(createEmployeeSalaryDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
    @Query('startMonth') startMonth?: string,
    @Query('endMonth') endMonth?: string,
    @Query('status') status?: SalaryStatus,
  ) {
    const skip = (page - 1) * pageSize;
    return this.employeeSalaryService.findAll(
      skip,
      pageSize,
      employeeId,
      startMonth,
      endMonth,
      status,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeSalaryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeeSalaryDto: UpdateEmployeeSalaryDto) {
    return this.employeeSalaryService.update(id, updateEmployeeSalaryDto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.employeeSalaryService.approve(id);
  }

  @Post(':id/mark-as-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  markAsPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pay_date?: string; payment_method?: string },
  ) {
    return this.employeeSalaryService.markAsPaid(id, body.pay_date, body.payment_method);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeeSalaryService.remove(id);
  }
}

