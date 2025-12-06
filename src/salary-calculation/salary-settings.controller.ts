import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SalarySettingsService } from './salary-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SalarySettings } from '../database/entities/SalarySettings.entity';

@ApiTags('salary-settings')
@Controller('salary-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SalarySettingsController {
  constructor(private readonly salarySettingsService: SalarySettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all salary settings (Admin only)' })
  async findAll() {
    return this.salarySettingsService.findAll();
  }

  @Get('role/:roleId')
  @ApiOperation({ summary: 'Get salary settings for a role' })
  async getByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.salarySettingsService.getByRole(roleId);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get salary settings for an employee' })
  async getByEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.salarySettingsService.getByEmployee(employeeId);
  }

  @Get('employee/:employeeId/effective')
  @ApiOperation({ summary: 'Get effective salary settings for an employee (checks employee-specific then role-based)' })
  async getForEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.salarySettingsService.getForEmployee(employeeId);
  }

  @Post('role/:roleId')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Set salary settings for a role (Admin only)' })
  async setForRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() settingsData: Partial<SalarySettings>,
  ) {
    return this.salarySettingsService.setForRole(roleId, settingsData);
  }

  @Post('employee/:employeeId')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Set salary settings for an employee (Admin only)' })
  async setForEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() settingsData: Partial<SalarySettings>,
  ) {
    return this.salarySettingsService.setForEmployee(employeeId, settingsData);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update salary settings (Admin only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() settingsData: Partial<SalarySettings>,
  ) {
    // This would need to be implemented in the service
    throw new Error('Not implemented');
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete salary settings (Admin only)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.salarySettingsService.delete(id);
  }
}

