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
  Req,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { AttendanceVerificationService } from './attendance-verification.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  RequestChallengeDto,
  SubmitAttendanceDto,
  RegisterDeviceDto,
  ChallengeResponseDto,
  AttendanceResultDto,
} from './dto/attendance-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeviceStatus } from '../database/entities/EmployeeDevice.entity';

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly verificationService: AttendanceVerificationService,
  ) {}

  // ============ VERIFICATION ENDPOINTS ============

  @Post('verify/request-challenge')
  @ApiOperation({
    summary: 'Request a challenge token for secure attendance',
    description:
      'First step in secure attendance flow. Returns challenge token and S3 upload URL for photo.',
  })
  @ApiBody({ type: RequestChallengeDto })
  @ApiResponse({ status: 201, description: 'Challenge created', type: ChallengeResponseDto })
  @ApiResponse({ status: 403, description: 'Device blocked' })
  async requestChallenge(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: RequestChallengeDto,
  ): Promise<ChallengeResponseDto> {
    const ipAddress = getClientIp(req);
    return this.verificationService.requestChallenge(req.user.id, dto, ipAddress);
  }

  @Post('verify/submit')
  @ApiOperation({
    summary: 'Submit attendance with verification data',
    description:
      'Second step in secure attendance flow. Validates challenge token, GPS, device, and stores attendance.',
  })
  @ApiBody({ type: SubmitAttendanceDto })
  @ApiResponse({ status: 201, description: 'Attendance recorded', type: AttendanceResultDto })
  @ApiResponse({ status: 400, description: 'Invalid/expired token or already checked in/out' })
  @ApiResponse({ status: 403, description: 'Device mismatch or not registered' })
  async submitAttendance(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: SubmitAttendanceDto,
    @Headers('user-agent') userAgent: string,
  ): Promise<AttendanceResultDto> {
    const ipAddress = getClientIp(req);
    return this.verificationService.submitAttendance(
      req.user.id,
      dto,
      ipAddress,
      userAgent || '',
    );
  }

  @Get('verify/today-status')
  @ApiOperation({ summary: "Get today's attendance status for current user" })
  @ApiResponse({ status: 200, description: "Today's attendance status" })
  async getTodayStatus(@Req() req: Request & { user: { id: number } }) {
    return this.verificationService.getTodayStatus(req.user.id);
  }

  // ============ DEVICE MANAGEMENT ENDPOINTS ============

  @Post('devices/register')
  @ApiOperation({ summary: 'Register a new device for attendance' })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiResponse({ status: 201, description: 'Device registered' })
  @ApiResponse({ status: 400, description: 'Device already registered' })
  async registerDevice(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: RegisterDeviceDto,
  ) {
    const ipAddress = getClientIp(req);
    return this.verificationService.registerDevice(req.user.id, dto, ipAddress);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get all devices registered for current user' })
  @ApiResponse({ status: 200, description: 'List of registered devices' })
  async getMyDevices(@Req() req: Request & { user: { id: number } }) {
    return this.verificationService.getEmployeeDevices(req.user.id);
  }

  @Get('devices/employee/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all devices registered for an employee (Admin only)' })
  @ApiParam({ name: 'employeeId', type: Number })
  @ApiResponse({ status: 200, description: 'List of registered devices' })
  async getEmployeeDevices(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.verificationService.getEmployeeDevices(employeeId);
  }

  @Patch('devices/:deviceId/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update device status (block/unblock)' })
  @ApiParam({ name: 'deviceId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Device status updated' })
  async updateDeviceStatus(
    @Param('deviceId', ParseIntPipe) deviceId: number,
    @Body('status') status: DeviceStatus,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.verificationService.updateDeviceStatus(deviceId, status, req.user.id);
  }

  @Delete('devices/:deviceId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a registered device' })
  @ApiParam({ name: 'deviceId', type: Number })
  @ApiResponse({ status: 200, description: 'Device deleted' })
  async deleteDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
    return this.verificationService.deleteDevice(deviceId);
  }

  // ============ LEGACY ENDPOINTS (kept for backward compatibility) ============

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create attendance record (Admin only)' })
  @ApiBody({ type: CreateAttendanceDto })
  @ApiResponse({ status: 201, description: 'Attendance record created successfully' })
  @ApiResponse({ status: 409, description: 'Attendance record already exists for this date' })
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Post('check-in/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Simple check in (Admin only - use /verify endpoints for secure check-in)',
  })
  @ApiParam({ name: 'employeeId', description: 'Employee ID', type: Number })
  @ApiResponse({ status: 201, description: 'Checked in successfully' })
  @ApiResponse({ status: 409, description: 'Already checked in today' })
  checkIn(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.attendanceService.checkIn(employeeId);
  }

  @Post('check-out/:employeeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Simple check out (Admin only - use /verify endpoints for secure check-out)',
  })
  @ApiParam({ name: 'employeeId', description: 'Employee ID', type: Number })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 404, description: 'No check-in record found for today' })
  @ApiResponse({ status: 400, description: 'Must check in before checking out' })
  @ApiResponse({ status: 409, description: 'Already checked out today' })
  checkOut(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.attendanceService.checkOut(employeeId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendance records' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    type: Number,
    description: 'Filter by employee ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'List of attendance records' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const skip = (page - 1) * pageSize;
    return this.attendanceService.findAll(skip, pageSize, employeeId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance record by ID' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: Number })
  @ApiResponse({ status: 200, description: 'Attendance record details' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: Number })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiResponse({ status: 200, description: 'Attendance record updated successfully' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete attendance record' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: Number })
  @ApiResponse({ status: 200, description: 'Attendance record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attendance record not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.remove(id);
  }
}
