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
import { LateEarlyRequestService } from './late-early-request.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LateEarlyType, LateEarlyStatus } from '../database/entities/LateEarlyRequest.entity';

@ApiTags('late-early-request')
@Controller('late-early-request')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class LateEarlyRequestController {
  constructor(private readonly lateEarlyService: LateEarlyRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create late/early request' })
  @ApiResponse({ status: 201, description: 'Late/Early request created successfully' })
  async create(@Request() req: any, @Body() createData: {
    date: string;
    type: LateEarlyType;
    actual_time?: string;
    minutes?: number;
    reason?: string;
  }) {
    return this.lateEarlyService.create(req.user.userId, createData);
  }

  @Get()
  @ApiOperation({ summary: 'Get late/early requests' })
  @ApiResponse({ status: 200, description: 'Late/Early requests retrieved successfully' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LateEarlyStatus,
    @Query('type') type?: LateEarlyType,
  ) {
    return this.lateEarlyService.findAll(
      employeeId ? parseInt(employeeId) : undefined,
      status,
      type,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get late/early request by ID' })
  @ApiResponse({ status: 200, description: 'Late/Early request retrieved successfully' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.lateEarlyService.findById(id);
  }

  @Put(':id/approve')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve late/early request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Late/Early request approved successfully' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.lateEarlyService.approve(id, req.user.userId, body.note);
  }

  @Put(':id/reject')
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject late/early request (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Late/Early request rejected successfully' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    return this.lateEarlyService.reject(id, req.user.userId, body.note);
  }
}

