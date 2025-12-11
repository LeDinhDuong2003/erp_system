import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HrRequestService } from './hr-request.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  HrRequestType,
  HrRequestStatus,
  LeaveType,
  LateEarlyType,
} from '../database/entities/HrRequest.entity';

@ApiTags('hr-request')
@Controller('hr-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class HrRequestController {
  constructor(private readonly hrRequestService: HrRequestService) {}

  // ============ LEAVE REQUEST ENDPOINTS ============

  @Post('leave')
  @ApiOperation({ summary: 'Create leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  async createLeaveRequest(
    @Body() body: {
      employee_id: number;
      leave_type: LeaveType;
      start_date: string;
      end_date: string;
      reason?: string;
    },
    @Request() req: any,
  ) {
    // If employee_id not provided, use current user
    const employeeId = body.employee_id || req.user.id;
    return this.hrRequestService.createLeaveRequest({
      ...body,
      employee_id: employeeId,
    });
  }

  // ============ OVERTIME REQUEST ENDPOINTS ============

  @Post('overtime')
  @ApiOperation({ summary: 'Create overtime request' })
  @ApiResponse({ status: 201, description: 'Overtime request created successfully' })
  async createOvertimeRequest(
    @Body() body: {
      employee_id: number;
      date: string;
      start_time: string;
      end_time: string;
      reason?: string;
    },
    @Request() req: any,
  ) {
    const employeeId = body.employee_id || req.user.id;
    return this.hrRequestService.createOvertimeRequest({
      ...body,
      employee_id: employeeId,
    });
  }

  // ============ LATE/EARLY REQUEST ENDPOINTS ============

  @Post('late-early')
  @ApiOperation({ summary: 'Create late/early request' })
  @ApiResponse({ status: 201, description: 'Late/early request created successfully' })
  async createLateEarlyRequest(
    @Body() body: {
      employee_id: number;
      date: string;
      type: LateEarlyType;
      actual_time?: string;
      minutes?: number;
      reason?: string;
    },
    @Request() req: any,
  ) {
    const employeeId = body.employee_id || req.user.id;
    return this.hrRequestService.createLateEarlyRequest({
      ...body,
      employee_id: employeeId,
    });
  }

  // ============ COMMON ENDPOINTS ============

  @Get()
  @ApiOperation({ summary: 'Get all HR requests with filters' })
  @ApiResponse({ status: 200, description: 'HR requests retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
    @Query('requestType') requestType?: HrRequestType,
    @Query('status') status?: HrRequestStatus,
  ) {
    const userRoles = req.user?.roles?.map((r: any) => r.code) || [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const isManager = userRoles.includes('MANAGER');

    const filters: any = {
      currentUser: {
        id: req.user.id,
        roles: req.user.roles,
      },
    };

    // If employeeId is explicitly provided, use it (for admins/managers viewing specific employee)
    if (employeeId && (isSuperAdmin || isManager)) {
      filters.employee_id = employeeId;
    }

    if (requestType) {
      filters.request_type = requestType;
    }
    if (status) {
      filters.status = status;
    }

    return this.hrRequestService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get HR request by ID' })
  @ApiResponse({ status: 200, description: 'HR request retrieved successfully' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hrRequestService.findOne(id);
  }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve HR request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'HR request approved successfully' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
    @Request() req: any,
  ) {
    return this.hrRequestService.approve(id, req.user.id, body.note, req.user.roles);
  }

  @Put(':id/reject')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject HR request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'HR request rejected successfully' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
    @Request() req: any,
  ) {
    return this.hrRequestService.reject(id, req.user.id, body.note, req.user.roles);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel HR request (own requests only)' })
  @ApiResponse({ status: 200, description: 'HR request cancelled successfully' })
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.hrRequestService.cancel(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update HR request (own pending requests only)' })
  @ApiResponse({ status: 200, description: 'HR request updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<any>,
    @Request() req: any,
  ) {
    return this.hrRequestService.update(id, updateData, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete HR request (own pending requests only)' })
  @ApiResponse({ status: 200, description: 'HR request deleted successfully' })
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.hrRequestService.delete(id, req.user.id);
    return { message: 'HR request deleted successfully' };
  }

  // ============ LEAVE BALANCE ============

  @Get('leave/balance/:employeeId')
  @ApiOperation({ summary: 'Get leave balance for employee' })
  @ApiResponse({ status: 200, description: 'Leave balance retrieved successfully' })
  async getLeaveBalance(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.hrRequestService.getLeaveBalance(employeeId, year);
  }

  @Get('leave/balance')
  @ApiOperation({ summary: 'Get leave balance for current user' })
  @ApiResponse({ status: 200, description: 'Leave balance retrieved successfully' })
  async getMyLeaveBalance(
    @Query('year', new ParseIntPipe({ optional: true })) year: number,
    @Request() req: any,
  ) {
    return this.hrRequestService.getLeaveBalance(req.user.id, year);
  }
}

