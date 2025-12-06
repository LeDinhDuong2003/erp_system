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
import { OvertimeRequestService } from './overtime-request.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OvertimeStatus } from '../database/entities/OvertimeRequest.entity';

@ApiTags('overtime-request')
@Controller('overtime-request')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OvertimeRequestController {
  constructor(private readonly overtimeService: OvertimeRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create overtime request' })
  @ApiResponse({ status: 201, description: 'Overtime request created successfully' })
  async create(@Request() req: any, @Body() createData: {
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }) {
    return this.overtimeService.create(req.user.userId, createData);
  }

  @Get()
  @ApiOperation({ summary: 'Get overtime requests' })
  @ApiResponse({ status: 200, description: 'Overtime requests retrieved successfully' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: OvertimeStatus,
  ) {
    return this.overtimeService.findAll(
      employeeId ? parseInt(employeeId) : undefined,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overtime request by ID' })
  @ApiResponse({ status: 200, description: 'Overtime request retrieved successfully' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.overtimeService.findById(id);
  }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve overtime request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Overtime request approved successfully' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.overtimeService.approve(id, req.user.userId, body.note);
  }

  @Put(':id/reject')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject overtime request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Overtime request rejected successfully' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.overtimeService.reject(id, req.user.userId, body.note);
  }
}

