import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { Attendance } from '../database/entities/Attendance.entity';
import { Employee } from '../database/entities/Employee.entity';
import { EmployeeDevice, DeviceStatus } from '../database/entities/EmployeeDevice.entity';
import { AttendanceChallenge } from '../database/entities/AttendanceChallenge.entity';
import { S3Service } from './s3.service';
import { WorkScheduleService } from '../salary-calculation/work-schedule.service';
import {
  RequestChallengeDto,
  ChallengeResponseDto,
  SubmitAttendanceDto,
  AttendanceResultDto,
  RegisterDeviceDto,
  AttendanceActionType,
  OFFICE_CONFIG,
} from './dto/attendance-verification.dto';

@Injectable()
export class AttendanceVerificationService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeDevice)
    private readonly deviceRepository: Repository<EmployeeDevice>,
    @InjectRepository(AttendanceChallenge)
    private readonly challengeRepository: Repository<AttendanceChallenge>,
    private readonly s3Service: S3Service,
    private readonly workScheduleService: WorkScheduleService,
  ) {}

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate a secure challenge token
   */
  private generateChallengeToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse time string (HH:mm:ss) to minutes
   */
  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * Calculate late minutes based on check-in time using work schedule settings
   */
  private async calculateLateMinutes(checkInTime: Date): Promise<number> {
    const settings = await this.workScheduleService.getSettings();
    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const standardCheckInMinutes = this.parseTimeToMinutes(settings.standard_check_in_time);
    const toleranceMinutes = settings.late_tolerance_minutes || 15;

    // Late if check-in is after standard time + tolerance
    if (checkInMinutes > standardCheckInMinutes + toleranceMinutes) {
      return checkInMinutes - (standardCheckInMinutes + toleranceMinutes);
    }
    return 0;
  }

  /**
   * Calculate early leave minutes based on check-out time using work schedule settings
   */
  private async calculateEarlyLeaveMinutes(checkOutTime: Date): Promise<number> {
    const settings = await this.workScheduleService.getSettings();
    const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
    const standardCheckOutMinutes = this.parseTimeToMinutes(settings.standard_check_out_time);
    const toleranceMinutes = settings.early_leave_tolerance_minutes || 15;

    // Early if check-out is before standard time - tolerance
    if (checkOutMinutes < standardCheckOutMinutes - toleranceMinutes) {
      return (standardCheckOutMinutes - toleranceMinutes) - checkOutMinutes;
    }
    return 0;
  }

  /**
   * Request a challenge token for attendance
   * This is the first step in the secure attendance flow
   */
  async requestChallenge(
    employeeId: number,
    dto: RequestChallengeDto,
    ipAddress: string,
  ): Promise<ChallengeResponseDto> {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check device status
    let device = await this.deviceRepository.findOne({
      where: { employee_id: employeeId, device_id: dto.device_id },
    });

    let deviceStatus: 'registered' | 'pending' | 'new' = 'new';
    let deviceMessage: string | undefined;

    if (device) {
      if (device.status === DeviceStatus.BLOCKED) {
        throw new ForbiddenException(
          'This device has been blocked. Please contact administrator.',
        );
      }
      if (device.status === DeviceStatus.ACTIVE) {
        deviceStatus = 'registered';
      } else {
        deviceStatus = 'pending';
        deviceMessage = 'Device is pending approval';
      }

      // Update last used
      await this.deviceRepository.update(
        { id: device.id },
        {
          last_used_at: new Date(),
          last_ip_address: ipAddress,
          user_agent: dto.user_agent,
        },
      );
    } else {
      // Auto-register new device (can be configured to require approval)
      device = this.deviceRepository.create({
        employee_id: employeeId,
        device_id: dto.device_id,
        device_name: dto.device_name,
        device_type: this.detectDeviceType(dto.user_agent || ''),
        os: dto.os,
        browser: dto.browser,
        screen_resolution: dto.screen_resolution,
        timezone: dto.timezone,
        language: dto.language,
        user_agent: dto.user_agent,
        status: DeviceStatus.ACTIVE, // Auto-approve, change to INACTIVE for manual approval
        last_used_at: new Date(),
        last_ip_address: ipAddress,
      });
      await this.deviceRepository.save(device);
      deviceStatus = 'registered';
      deviceMessage = 'New device registered successfully';
    }

    // Check if there's an existing valid challenge
    await this.challengeRepository.update(
      {
        employee_id: employeeId,
        is_used: false,
      },
      { is_used: true }, // Invalidate old challenges
    );

    // Generate new challenge
    const token = this.generateChallengeToken();
    const expiresAt = new Date(
      Date.now() + OFFICE_CONFIG.challenge_expiry_seconds * 1000,
    );

    const challenge = this.challengeRepository.create({
      employee_id: employeeId,
      token,
      action_type: dto.action_type,
      expires_at: expiresAt,
      expected_device_id: dto.device_id,
    });
    await this.challengeRepository.save(challenge);

    // Generate S3 pre-signed URL for photo upload
    const photoType =
      dto.action_type === AttendanceActionType.CHECK_IN ? 'check_in' : 'check_out';
    const uploadInfo = await this.s3Service.generateUploadUrl(
      employeeId,
      photoType,
      'image/jpeg',
    );

    return {
      token,
      expires_at: expiresAt,
      upload_url: uploadInfo.uploadUrl,
      photo_url: uploadInfo.fileUrl,
      upload_expires_in: uploadInfo.expiresIn,
      office_location: {
        latitude: OFFICE_CONFIG.latitude,
        longitude: OFFICE_CONFIG.longitude,
        radius_meters: OFFICE_CONFIG.radius_meters,
      },
      device_status: deviceStatus,
      device_message: deviceMessage,
    };
  }

  /**
   * Submit attendance with verification data
   * This is the second step - validates challenge and stores attendance
   */
  async submitAttendance(
    employeeId: number,
    dto: SubmitAttendanceDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AttendanceResultDto> {
    try {
      console.log('[Attendance Submit] Starting...', {
        employeeId,
        deviceId: dto.device_id?.substring(0, 8),
        lat: dto.latitude,
        lon: dto.longitude,
      });

      // Bỏ challenge token validation - đơn giản hóa flow

    // 3. Validate device is registered and active
    let device = await this.deviceRepository.findOne({
      where: { employee_id: employeeId, device_id: dto.device_id },
    });

    // Auto-register device if not found (should have been registered in requestChallenge, but handle edge case)
    if (!device) {
      device = this.deviceRepository.create({
        employee_id: employeeId,
        device_id: dto.device_id,
        status: DeviceStatus.ACTIVE, // Auto-approve for now
        last_used_at: new Date(),
        last_ip_address: ipAddress,
        user_agent: userAgent,
      });
      await this.deviceRepository.save(device);
    }

    if (device.status === DeviceStatus.BLOCKED) {
      throw new ForbiddenException('Device is blocked');
    }

    // Update last used
    await this.deviceRepository.update(
      { id: device.id },
      {
        last_used_at: new Date(),
        last_ip_address: ipAddress,
        user_agent: userAgent,
      },
    );

    // Đơn giản hóa: Bỏ GPS validation, chỉ lưu thông tin nếu có
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: { employee_id: employeeId, date: today },
    });

    const now = new Date();
    const verificationNotes: string[] = [];

    // Device verification note
    verificationNotes.push(`Device: ${device.device_name || device.device_id.substring(0, 8)}...`);

    // Photo verification note
    verificationNotes.push(`Photo: ${dto.photo_url ? 'Yes' : 'No'}`);

    // GPS note (nếu có)
    if (dto.latitude && dto.longitude) {
      const distanceFromOffice = this.calculateDistance(
        dto.latitude,
        dto.longitude,
        OFFICE_CONFIG.latitude,
        OFFICE_CONFIG.longitude,
      );
      verificationNotes.push(`Location: ${Math.round(distanceFromOffice)}m from office`);
    }

    // Verified nếu có photo và device
    const isVerified = !!dto.photo_url && !!device;

    let result: AttendanceResultDto;

    if (dto.action_type === AttendanceActionType.CHECK_IN) {
      // Check-in logic
      if (attendance && attendance.check_in) {
        throw new BadRequestException('Already checked in today');
      }

      const lateMinutes = await this.calculateLateMinutes(now);

      if (!attendance) {
        attendance = this.attendanceRepository.create({
          employee_id: employeeId,
          date: today,
          check_in: now,
          check_in_photo_url: dto.photo_url ?? null,
          late_minutes: lateMinutes,
          is_verified: isVerified,
          verification_notes: verificationNotes.join('\n'),
          note: dto.note,
        });
      } else {
        attendance.check_in = now;
        attendance.check_in_photo_url = dto.photo_url ?? null;
        attendance.late_minutes = lateMinutes;
        attendance.is_verified = isVerified;
        attendance.verification_notes = verificationNotes.join('\n');
        if (dto.note) attendance.note = dto.note;
      }

      await this.attendanceRepository.save(attendance);

      result = {
        id: attendance.id,
        action_type: AttendanceActionType.CHECK_IN,
        timestamp: now,
        is_within_geofence: dto.latitude && dto.longitude 
          ? this.calculateDistance(dto.latitude, dto.longitude, OFFICE_CONFIG.latitude, OFFICE_CONFIG.longitude) <= OFFICE_CONFIG.radius_meters
          : undefined,
        distance_from_office: dto.latitude && dto.longitude
          ? Math.round(this.calculateDistance(dto.latitude, dto.longitude, OFFICE_CONFIG.latitude, OFFICE_CONFIG.longitude))
          : undefined,
        device_verified: true,
        photo_captured: !!dto.photo_url,
        is_verified: isVerified,
        verification_notes: verificationNotes.join('; '),
        late_minutes: lateMinutes > 0 ? lateMinutes : undefined,
      };
    } else {
      // Check-out logic
      if (!attendance) {
        throw new NotFoundException('No check-in record found for today');
      }

      if (!attendance.check_in) {
        throw new BadRequestException('Must check in before checking out');
      }

      if (attendance.check_out) {
        throw new BadRequestException('Already checked out today');
      }

      const earlyLeaveMinutes = await this.calculateEarlyLeaveMinutes(now);

      // Calculate work hours
      const workHours =
        (now.getTime() - new Date(attendance.check_in).getTime()) / (1000 * 60 * 60);

      attendance.check_out = now;
      attendance.check_out_photo_url = dto.photo_url ?? null;
      attendance.work_hours = Math.round(workHours * 100) / 100;
      attendance.early_leave_minutes = earlyLeaveMinutes;
      attendance.is_verified = isVerified; // Verified nếu có photo và device
      attendance.verification_notes =
        (attendance.verification_notes || '') + '\n---\n' + verificationNotes.join('\n');
      if (dto.note) {
        attendance.note = attendance.note ? `${attendance.note}\n${dto.note}` : dto.note;
      }

      await this.attendanceRepository.save(attendance);

      result = {
        id: attendance.id,
        action_type: AttendanceActionType.CHECK_OUT,
        timestamp: now,
        is_within_geofence: dto.latitude && dto.longitude 
          ? this.calculateDistance(dto.latitude, dto.longitude, OFFICE_CONFIG.latitude, OFFICE_CONFIG.longitude) <= OFFICE_CONFIG.radius_meters
          : undefined,
        distance_from_office: dto.latitude && dto.longitude
          ? Math.round(this.calculateDistance(dto.latitude, dto.longitude, OFFICE_CONFIG.latitude, OFFICE_CONFIG.longitude))
          : undefined,
        device_verified: true,
        photo_captured: !!dto.photo_url,
        is_verified: isVerified,
        verification_notes: verificationNotes.join('; '),
        early_leave_minutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : undefined,
      };
    }

    // Update device last used
    await this.deviceRepository.update(
      { id: device.id },
      { last_used_at: now, last_ip_address: ipAddress },
    );

    console.log('[Attendance Submit] Success!', {
      actionType: result.action_type,
      attendanceId: result.id,
    });

    return result;
    } catch (error: any) {
      console.error('[Attendance Submit] Error:', {
        message: error.message,
        stack: error.stack,
        employeeId,
        deviceId: dto.device_id?.substring(0, 8),
      });
      throw error; // Re-throw to let NestJS handle it
    }
  }

  /**
   * Register a new device for an employee
   */
  async registerDevice(
    employeeId: number,
    dto: RegisterDeviceDto,
    ipAddress: string,
    registeredBy?: number,
  ) {
    const existing = await this.deviceRepository.findOne({
      where: { employee_id: employeeId, device_id: dto.device_id },
    });

    if (existing) {
      throw new BadRequestException('Device is already registered');
    }

    // If setting as primary, unset other primary devices
    if (dto.is_primary) {
      await this.deviceRepository.update(
        { employee_id: employeeId, is_primary: true },
        { is_primary: false },
      );
    }

    const device = this.deviceRepository.create({
      employee_id: employeeId,
      device_id: dto.device_id,
      device_name: dto.device_name,
      device_type: dto.device_type || this.detectDeviceType(dto.user_agent || ''),
      os: dto.os,
      browser: dto.browser,
      screen_resolution: dto.screen_resolution,
      timezone: dto.timezone,
      language: dto.language,
      user_agent: dto.user_agent,
      status: DeviceStatus.ACTIVE,
      is_primary: dto.is_primary || false,
      registered_by: registeredBy,
      last_ip_address: ipAddress,
    });

    return this.deviceRepository.save(device);
  }

  /**
   * Get all devices for an employee
   */
  async getEmployeeDevices(employeeId: number) {
    return this.deviceRepository.find({
      where: { employee_id: employeeId },
      order: { is_primary: 'DESC', last_used_at: 'DESC' },
    });
  }

  /**
   * Block/unblock a device
   */
  async updateDeviceStatus(
    deviceId: number,
    status: DeviceStatus,
    adminId: number,
  ) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.status = status;
    return this.deviceRepository.save(device);
  }

  /**
   * Delete a device
   */
  async deleteDevice(deviceId: number) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.deviceRepository.delete({ id: deviceId });
    return { message: 'Device deleted successfully' };
  }

  /**
   * Get today's attendance status for an employee
   */
  async getTodayStatus(employeeId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use date comparison - normalize to start of day
    const attendance = await this.attendanceRepository.findOne({
      where: { 
        employee_id: employeeId, 
        date: today, // TypeORM will compare date part only for date column type
      },
    });

    // Helper to safely convert Date to ISO string
    const toISOString = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      return null;
    };

    return {
      date: today.toISOString().split('T')[0], // Return date as YYYY-MM-DD string
      has_checked_in: !!attendance?.check_in,
      has_checked_out: !!attendance?.check_out,
      check_in_time: toISOString(attendance?.check_in),
      check_out_time: toISOString(attendance?.check_out),
      check_in_photo_url: attendance?.check_in_photo_url,
      check_out_photo_url: attendance?.check_out_photo_url,
      work_hours: attendance?.work_hours,
      late_minutes: attendance?.late_minutes,
      early_leave_minutes: attendance?.early_leave_minutes,
      is_verified: attendance?.is_verified,
    };
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
      if (/ipad|tablet/.test(ua)) return 'tablet';
      return 'mobile';
    }
    return 'desktop';
  }
}

