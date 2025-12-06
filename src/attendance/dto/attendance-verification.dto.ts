import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
  IsUrl,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export enum AttendanceActionType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

// ============ REQUEST CHALLENGE DTO ============
export class RequestChallengeDto {
  @ApiProperty({ description: 'Device fingerprint hash', example: 'abc123def456...' })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiProperty({ enum: AttendanceActionType, description: 'Action type' })
  @IsEnum(AttendanceActionType)
  action_type: AttendanceActionType;

  @ApiPropertyOptional({ description: 'Device name', example: 'iPhone 14 Pro' })
  @IsString()
  @IsOptional()
  device_name?: string;

  @ApiPropertyOptional({ description: 'Operating system', example: 'iOS 17.1' })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiPropertyOptional({ description: 'Browser', example: 'Safari 17' })
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiPropertyOptional({ description: 'Screen resolution', example: '1170x2532' })
  @IsString()
  @IsOptional()
  screen_resolution?: string;

  @ApiPropertyOptional({ description: 'User timezone', example: 'Asia/Ho_Chi_Minh' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Browser language', example: 'vi-VN' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Full user agent string' })
  @IsString()
  @IsOptional()
  user_agent?: string;
}

// ============ CHALLENGE RESPONSE DTO ============
export class ChallengeResponseDto {
  @ApiProperty({ description: 'Challenge token' })
  token: string;

  @ApiProperty({ description: 'Token expiration time' })
  expires_at: Date;

  @ApiProperty({ description: 'Pre-signed URL for photo upload' })
  upload_url: string;

  @ApiProperty({ description: 'Final photo URL after upload' })
  photo_url: string;

  @ApiProperty({ description: 'Upload URL expiration in seconds' })
  upload_expires_in: number;

  @ApiProperty({ description: 'Office location for GPS validation' })
  office_location: {
    latitude: number;
    longitude: number;
    radius_meters: number;
  };

  @ApiProperty({ description: 'Device registration status' })
  device_status: 'registered' | 'pending' | 'new';

  @ApiPropertyOptional({ description: 'Message about device status' })
  device_message?: string;
}

// ============ SUBMIT ATTENDANCE DTO ============
export class SubmitAttendanceDto {
  @ApiProperty({ enum: AttendanceActionType, description: 'Action type' })
  @IsEnum(AttendanceActionType)
  action_type: AttendanceActionType;

  @ApiProperty({ description: 'Device fingerprint hash' })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  // GPS coordinates - Optional (không bắt buộc)
  @ApiPropertyOptional({ description: 'GPS latitude', example: 20.982011 })
  @IsOptional()
  @ValidateIf((o) => o.latitude !== undefined && o.latitude !== null)
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 105.791223 })
  @IsOptional()
  @ValidateIf((o) => o.longitude !== undefined && o.longitude !== null)
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters', example: 15 })
  @IsOptional()
  @ValidateIf((o) => o.gps_accuracy !== undefined && o.gps_accuracy !== null)
  @IsNumber()
  @Min(0)
  @Max(1000)
  gps_accuracy?: number;

  // Photo URL (after uploading to S3) - optional for now
  @ApiPropertyOptional({ description: 'Photo URL after uploading to S3' })
  @IsOptional()
  @ValidateIf((o) => o.photo_url !== undefined && o.photo_url !== null)
  @IsString()
  photo_url?: string | null;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  note?: string;
}

// ============ ATTENDANCE RESULT DTO ============
export class AttendanceResultDto {
  @ApiProperty({ description: 'Attendance record ID' })
  id: number;

  @ApiProperty({ description: 'Action type' })
  action_type: AttendanceActionType;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;

  @ApiPropertyOptional({ description: 'Is within geofence (only if GPS provided)' })
  is_within_geofence?: boolean;

  @ApiPropertyOptional({ description: 'Distance from office in meters (only if GPS provided)' })
  distance_from_office?: number;

  @ApiProperty({ description: 'Device verified' })
  device_verified: boolean;

  @ApiProperty({ description: 'Photo captured' })
  photo_captured: boolean;

  @ApiProperty({ description: 'Overall verification status' })
  is_verified: boolean;

  @ApiPropertyOptional({ description: 'Verification notes' })
  verification_notes?: string;

  @ApiPropertyOptional({ description: 'Late minutes (for check-in)' })
  late_minutes?: number;

  @ApiPropertyOptional({ description: 'Early leave minutes (for check-out)' })
  early_leave_minutes?: number;
}

// ============ REGISTER DEVICE DTO ============
export class RegisterDeviceDto {
  @ApiProperty({ description: 'Device fingerprint hash' })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsString()
  @IsOptional()
  device_name?: string;

  @ApiPropertyOptional({ description: 'Device type', example: 'mobile' })
  @IsString()
  @IsOptional()
  device_type?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiPropertyOptional({ description: 'Browser' })
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiPropertyOptional({ description: 'Screen resolution' })
  @IsString()
  @IsOptional()
  screen_resolution?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsString()
  @IsOptional()
  user_agent?: string;

  @ApiPropertyOptional({ description: 'Set as primary device' })
  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}

// ============ DEVICE STATUS DTO ============
export class DeviceStatusDto {
  @ApiProperty({ description: 'Device ID' })
  id: number;

  @ApiProperty({ description: 'Device fingerprint' })
  device_id: string;

  @ApiProperty({ description: 'Device name' })
  device_name: string | null;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Is primary device' })
  is_primary: boolean;

  @ApiProperty({ description: 'Last used at' })
  last_used_at: Date | null;

  @ApiProperty({ description: 'Created at' })
  created_at: Date;
}

// ============ OFFICE CONFIG ============
export const OFFICE_CONFIG = {
  // Default office location (can be configured via environment variables)
  latitude: parseFloat(process.env.OFFICE_LATITUDE || '20.982011'),
  longitude: parseFloat(process.env.OFFICE_LONGITUDE || '105.791223'),
  // Geofence radius in meters
  radius_meters: parseInt(process.env.OFFICE_RADIUS || '300', 10),
  // Work hours config
  work_start_hour: 8, // 8:00 AM
  work_start_minute: 30,
  work_end_hour: 17, // 5:00 PM
  work_end_minute: 30,
  // Challenge token expiry in seconds
  challenge_expiry_seconds: 300, // 5 minutes
};

