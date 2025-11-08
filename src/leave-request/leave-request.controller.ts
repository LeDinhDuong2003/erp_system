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
  Request,
} from '@nestjs/common';
import { LeaveRequestService } from './leave-request.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LeaveStatus } from '../database/entities/LeaveRequest.entity';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  create(@Body() createLeaveRequestDto: CreateLeaveRequestDto, @Request() req: any) {
    // Set employee_id from authenticated user if not provided
    if (!createLeaveRequestDto.employee_id && req.user?.id) {
      createLeaveRequestDto.employee_id = req.user.id;
    }
    return this.leaveRequestService.create(createLeaveRequestDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const skip = (page - 1) * pageSize;
    return this.leaveRequestService.findAll(
      skip,
      pageSize,
      employeeId,
      status,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leaveRequestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLeaveRequestDto: UpdateLeaveRequestDto) {
    return this.leaveRequestService.update(id, updateLeaveRequestDto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const approverId = req.user?.id;
    if (!approverId) {
      throw new Error('Approver ID not found');
    }
    return this.leaveRequestService.approve(id, approverId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const approverId = req.user?.id;
    if (!approverId) {
      throw new Error('Approver ID not found');
    }
    return this.leaveRequestService.reject(id, approverId);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const employeeId = req.user?.id;
    if (!employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.leaveRequestService.cancel(id, employeeId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leaveRequestService.remove(id);
  }
}

