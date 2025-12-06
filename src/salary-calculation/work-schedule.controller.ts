import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkScheduleSettings } from '../database/entities/WorkScheduleSettings.entity';

@ApiTags('work-schedule')
@Controller('work-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get work schedule settings' })
  @ApiResponse({ status: 200, description: 'Work schedule settings retrieved successfully' })
  async getSettings() {
    return this.workScheduleService.getSettings();
  }

  @Put('settings')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update work schedule settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Work schedule settings updated successfully' })
  async updateSettings(@Body() updateData: Partial<WorkScheduleSettings>) {
    return this.workScheduleService.updateSettings(updateData);
  }
}

