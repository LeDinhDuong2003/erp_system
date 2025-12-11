import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Employee, EmployeeStatus } from '../database/entities/Employee.entity';
import { RefreshToken } from '../database/entities/RefreshToken.entity';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { AUTH_EMAIL_QUEUE, AuthEmailJob } from './auth-email.processor';

interface OTPData {
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  // Fallback in-memory OTP storage (used when Redis is unavailable)
  private passwordChangeOTPs = new Map<number, OTPData>();
  private loginOTPs = new Map<string, OTPData>(); // Key: username, Value: OTP data

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
    @InjectQueue(AUTH_EMAIL_QUEUE)
    private readonly authEmailQueue: Queue<AuthEmailJob>,
  ) {
    // Cleanup expired OTPs every 5 minutes (only for in-memory fallback)
    setInterval(() => {
      const now = new Date();
      for (const [userId, otpData] of this.passwordChangeOTPs.entries()) {
        if (otpData.expiresAt < now) {
          this.passwordChangeOTPs.delete(userId);
        }
      }
      for (const [username, otpData] of this.loginOTPs.entries()) {
        if (otpData.expiresAt < now) {
          this.loginOTPs.delete(username);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check if Redis is available, fallback to in-memory
   */
  private async useRedis(): Promise<boolean> {
    try {
      const isConnected = await this.redisService.isConnected();
      if (!isConnected) {
        console.warn('[AuthService] Redis is not connected, will use fallback storage');
      }
      return isConnected;
    } catch (error) {
      console.error('[AuthService] Error checking Redis connection:', error);
      return false;
    }
  }

  /**
   * Generate Redis key for login OTP
   */
  private getLoginOTPKey(username: string): string {
    return `login:otp:${username}`;
  }

  /**
   * Generate Redis key for password change OTP
   */
  private getPasswordChangeOTPKey(userId: number): string {
    return `password:otp:${userId}`;
  }

  /**
   * Generate Redis key for email verification token
   */
  private getEmailVerificationTokenKey(token: string): string {
    return `email:verification:${token}`;
  }

  async validateUser(username: string, password: string) {
    const employee = await this.employeeRepository.findOne({
      where: { username },
      relations: [
        'employee_role_assignments',
        'employee_role_assignments.role',
        'employee_role_assignments.role.role_permissions',
        'employee_role_assignments.role.role_permissions.permission',
      ],
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is permanently locked (SUSPENDED due to 10 failed attempts)
    if (employee.status === EmployeeStatus.SUSPENDED && employee.failed_login_count >= 10) {
      throw new ForbiddenException(
        'Tài khoản đã bị khóa vĩnh viễn do nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ quản trị viên để mở khóa.',
      );
    }

    // Check if account is temporarily locked
    if (employee.locked_until && employee.locked_until > new Date()) {
      const remainingMinutes = Math.ceil((employee.locked_until.getTime() - Date.now()) / (60 * 1000));
      const failedCount = employee.failed_login_count || 0;
      throw new ForbiddenException(
        `Tài khoản đã bị khóa do nhập sai mật khẩu ${failedCount} lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    // Check if account is active
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    // Check if email is verified
    if (!employee.is_verified) {
      throw new ForbiddenException(
        'Tài khoản chưa được xác thực. Vui lòng kiểm tra email và click vào link xác thực.',
      );
    }

    // Check password
    if (!employee.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      // Increment failed login count
      // Ensure failed_login_count is a number (default to 0 if null/undefined)
      const currentFailedCount = employee.failed_login_count ?? 0;
      const newFailedCount = currentFailedCount + 1;
      
      console.log(`[Login Failed] Username: ${username}, Current count: ${currentFailedCount}, New count: ${newFailedCount}`);
      
      // Calculate lock duration based on failed attempts
      // 5 attempts = 5 minutes, 6 = 10min, 7 = 15min, 8 = 20min, 9 = 30min, 10+ = permanent lock
      let lockDuration: number | null = null;
      let isPermanentLock = false;
      
      if (newFailedCount >= 10) {
        // Permanent lock - set status to SUSPENDED
        isPermanentLock = true;
      await this.employeeRepository.update(
        { id: employee.id },
        {
          failed_login_count: newFailedCount,
            status: EmployeeStatus.SUSPENDED,
            locked_until: null, // Permanent lock, no unlock time
          },
        );
      } else if (newFailedCount >= 9) {
        lockDuration = 30 * 60 * 1000; // 30 minutes
      } else if (newFailedCount >= 8) {
        lockDuration = 20 * 60 * 1000; // 20 minutes
      } else if (newFailedCount >= 7) {
        lockDuration = 15 * 60 * 1000; // 15 minutes
      } else if (newFailedCount >= 6) {
        lockDuration = 10 * 60 * 1000; // 10 minutes
      } else if (newFailedCount >= 5) {
        lockDuration = 5 * 60 * 1000; // 5 minutes
      }

      const updateData: any = {
        failed_login_count: newFailedCount,
      };

      if (lockDuration !== null) {
        updateData.locked_until = new Date(Date.now() + lockDuration);
      }

      const updateResult = await this.employeeRepository.update(
        { id: employee.id },
        updateData,
      );
      
      console.log(`[Login Failed] Username: ${username}, Employee ID: ${employee.id}`);
      console.log(`[Login Failed] Current count: ${currentFailedCount}, New count: ${newFailedCount}`);
      console.log(`[Login Failed] Update result - affected: ${updateResult.affected}`);

      // Prepare error message with attempt count and lock info
      let errorMessage = `Sai mật khẩu. Số lần sai: ${newFailedCount}`;
      
      if (isPermanentLock) {
        errorMessage += '. Tài khoản đã bị khóa vĩnh viễn. Vui lòng liên hệ quản trị viên để mở khóa.';
      } else if (lockDuration !== null) {
        const lockMinutes = lockDuration / (60 * 1000);
        errorMessage += `. Tài khoản sẽ bị khóa ${lockMinutes} phút sau lần sai này.`;
      } else if (newFailedCount >= 4) {
        const remainingAttempts = 5 - newFailedCount;
        errorMessage += `. Cảnh báo: Sau ${remainingAttempts} lần sai nữa, tài khoản sẽ bị khóa 5 phút.`;
      }

      throw new UnauthorizedException(errorMessage);
    }

    // Check if 2FA is enabled
    if (employee.two_factor_enabled) {
      // Generate and send OTP for 2FA
      const otp = this.emailService.generateOTP();
      const ttlSeconds = 10 * 60; // 10 minutes
      
      // Store OTP in Redis or fallback to in-memory
      const useRedisCache = await this.useRedis();
      if (useRedisCache) {
        const key = this.getLoginOTPKey(employee.username);
        await this.redisService.set(key, otp, ttlSeconds);
      } else {
        // Fallback to in-memory
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        this.loginOTPs.set(employee.username, { otp, expiresAt });
      }
      
      // Send OTP email via queue
      await this.authEmailQueue.add('send-login-otp', {
        type: 'login-otp',
        email: employee.email,
        fullName: employee.full_name,
        data: { otp },
      });
      
      // Return indication that OTP is required
      return {
        requires2FA: true,
        username: employee.username,
        message: 'Vui lòng nhập mã OTP đã được gửi đến email của bạn.',
      };
    }

    // Reset failed login count on successful login
    if (employee.failed_login_count > 0 || employee.locked_until) {
      await this.employeeRepository.update(
        { id: employee.id },
        { failed_login_count: 0, locked_until: null, last_login: new Date() },
      );
    } else {
      await this.employeeRepository.update(
        { id: employee.id },
        { last_login: new Date() },
      );
    }

    return {
      id: employee.id,
      username: employee.username,
      email: employee.email,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      roles: employee.employee_role_assignments.map((er) => er.role),
      requires2FA: false,
    };
  }

  /**
   * Verify login OTP for 2FA
   */
  async verifyLoginOTP(username: string, otp: string) {
    const useRedisCache = await this.useRedis();
    let storedOTP: string | null = null;

    if (useRedisCache) {
      // Get OTP from Redis
      const key = this.getLoginOTPKey(username);
      storedOTP = await this.redisService.get(key);
      
      if (!storedOTP) {
        throw new UnauthorizedException('Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
      }

      // Verify OTP
      if (storedOTP !== otp) {
        throw new UnauthorizedException('Mã OTP không đúng. Vui lòng thử lại.');
      }

      // Delete OTP after successful verification
      await this.redisService.delete(key);
    } else {
      // Fallback to in-memory
      const otpData = this.loginOTPs.get(username);
      
      if (!otpData) {
        throw new UnauthorizedException('Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
      }

      if (otpData.expiresAt < new Date()) {
        this.loginOTPs.delete(username);
        throw new UnauthorizedException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
      }

      if (otpData.otp !== otp) {
        throw new UnauthorizedException('Mã OTP không đúng. Vui lòng thử lại.');
      }

      // Delete OTP after successful verification
      this.loginOTPs.delete(username);
    }

    // OTP is valid, get employee and complete login
    const employee = await this.employeeRepository.findOne({
      where: { username },
      relations: [
        'employee_role_assignments',
        'employee_role_assignments.role',
        'employee_role_assignments.role.role_permissions',
        'employee_role_assignments.role.role_permissions.permission',
      ],
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove OTP after successful verification
    this.loginOTPs.delete(username);

    // Reset failed login count on successful login
    if (employee.failed_login_count > 0 || employee.locked_until) {
      await this.employeeRepository.update(
        { id: employee.id },
        { failed_login_count: 0, locked_until: null, last_login: new Date() },
      );
    } else {
      await this.employeeRepository.update(
        { id: employee.id },
        { last_login: new Date() },
      );
    }

    return {
      id: employee.id,
      username: employee.username,
      email: employee.email,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      roles: employee.employee_role_assignments.map((er) => er.role),
    };
  }

  /**
   * Complete login after 2FA OTP verification
   */
  async completeLoginAfter2FA(user: { id: number; username: string; email: string }) {
    return this.login(user);
  }

  private parseExpiresIn(value: string | undefined, fallbackSeconds: number): number {
    if (!value) return fallbackSeconds;
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
    const match = /^\s*(\d+)\s*([smhd])\s*$/i.exec(value);
    if (!match) return fallbackSeconds;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitToSeconds: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * unitToSeconds[unit];
  }

  private async generateTokens(user: {
    id: number;
    username: string;
    email: string;
  }) {
    const basePayload = {
      sub: user.id.toString(),
      username: user.username,
      email: user.email,
    };
    const accessExpiresIn = this.parseExpiresIn(
      process.env.JWT_ACCESS_EXPIRES_IN,
      15 * 60,
    );
    const refreshExpiresIn = this.parseExpiresIn(
      process.env.JWT_REFRESH_EXPIRES_IN,
      7 * 24 * 60 * 60,
    );

    const accessToken = await this.jwtService.signAsync(basePayload, {
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      expiresIn: accessExpiresIn,
    });
    const refreshToken = await this.jwtService.signAsync(basePayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
      expiresIn: refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  async login(user: { id: number; username: string; email: string; requires2FA?: boolean }) {
    // If 2FA is required, return indication instead of tokens
    if (user.requires2FA) {
      return {
        requires2FA: true,
        username: user.username,
        message: 'Vui lòng nhập mã OTP đã được gửi đến email của bạn.',
      };
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() +
        this.parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60),
    );

    // Save refresh token to database
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        employee_id: user.id,
        token_hash: refreshHash,
        expires_at: expiresAt,
        revoked: false,
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(user: { id: number; username: string; email: string }) {
    return this.login(user);
  }

  async validateRefreshToken(userId: string, refreshToken: string) {
    const employeeId = parseInt(userId, 10);

    // Find all non-revoked, non-expired refresh tokens for this user
    const tokens = await this.refreshTokenRepository.find({
      where: { employee_id: employeeId, revoked: false },
      order: { created_at: 'DESC' },
    });

    // Try to match the provided token with stored hashes
    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
      if (isMatch) {
        // Revoke the old token
        await this.refreshTokenRepository.update({ id: tokenRecord.id }, { revoked: true });

        const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

        if (!employee) {
          throw new UnauthorizedException('User not found');
        }

        if (employee.status !== EmployeeStatus.ACTIVE) {
          throw new ForbiddenException('Account is not active');
        }

        return {
          id: employee.id,
          username: employee.username,
          email: employee.email,
        };
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async verifyEmail(token: string) {
    const useRedisCache = await this.useRedis();
    let email: string | null = null;

    if (useRedisCache) {
      // Get email from Redis using token
      const key = this.getEmailVerificationTokenKey(token);
      email = await this.redisService.get(key);
      
      if (!email) {
        throw new BadRequestException('Invalid or expired verification token. Please request a new verification email.');
      }

      // Delete token after successful verification
      await this.redisService.delete(key);
    } else {
      // Fallback: Redis not available - token should be in Redis
      // If Redis is down, we cannot verify tokens
      throw new BadRequestException('Verification service temporarily unavailable. Please try again later.');
    }

    // Find employee by email and update verification status
    const employee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (!employee) {
      throw new BadRequestException('User not found');
    }

    if (employee.is_verified) {
      throw new BadRequestException('Email already verified');
    }

    // Update employee to verified
    await this.employeeRepository.update(
      { id: employee.id },
      {
        is_verified: true,
        email_verified_at: new Date(),
      },
    );

    return {
      message: 'Email verified successfully. You can now login.',
      email: employee.email,
    };
  }

  async resendVerificationEmail(email: string) {
    const employee = await this.employeeRepository.findOne({
      where: { email },
    });

    if (!employee) {
      throw new NotFoundException('User not found');
    }

    if (employee.is_verified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new token
    const verificationToken = this.emailService.generateVerificationToken();
    const ttlSeconds = 24 * 60 * 60; // 24 hours

    // Store token in Redis (ưu tiên) hoặc fallback to database
    try {
      const useRedisCache = await this.useRedis();
      if (useRedisCache) {
        // Store token in Redis with email as value
        const key = this.getEmailVerificationTokenKey(verificationToken);
        await this.redisService.set(key, email, ttlSeconds);
        console.log(`[Email Verification] ✅ Token stored in Redis for ${email}, TTL: ${ttlSeconds}s`);
      } else {
        // Fallback: Redis not available - cannot store token
        console.warn(`[Email Verification] ⚠️  Redis not available, cannot store token for ${email}`);
        throw new BadRequestException('Verification service temporarily unavailable. Please try again later.');
      }
    } catch (error) {
      console.error(`[Email Verification] ❌ Error storing token for ${email}:`, error);
      throw new BadRequestException('Failed to generate verification token. Please try again later.');
    }

    // Send email via queue
    await this.authEmailQueue.add('send-verification-email', {
      type: 'verification',
      email: employee.email,
      fullName: employee.full_name,
      data: { token: verificationToken },
    });

    return {
      message: 'Verification email sent successfully',
    };
  }

  async revoke(userId: string) {
    const employeeId = parseInt(userId, 10);
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true })
      .where('employee_id = :employeeId AND revoked = false', { employeeId })
      .execute();
  }

  async revokeSpecificToken(userId: string, refreshToken: string) {
    const employeeId = parseInt(userId, 10);

    const tokens = await this.refreshTokenRepository.find({
      where: { employee_id: employeeId, revoked: false },
    });

    for (const tokenRecord of tokens) {
      const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
      if (isMatch) {
        await this.refreshTokenRepository.update({ id: tokenRecord.id }, { revoked: true });
        return;
      }
    }

    throw new BadRequestException('Refresh token not found');
  }

  async cleanupExpiredTokens() {
    // Remove expired tokens older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expires_at < :cutoffDate', { cutoffDate })
      .execute();
  }

  /**
   * Request OTP for password change
   */
  async requestPasswordChangeOTP(userId: number): Promise<{ message: string }> {
    const employee = await this.employeeRepository.findOne({ where: { id: userId } });
    if (!employee) {
      throw new NotFoundException('User not found');
    }

    // Generate OTP
    const otp = this.emailService.generateOTP();
    const ttlSeconds = 10 * 60; // 10 minutes
    
    // Store OTP in Redis or fallback to in-memory
    const useRedisCache = await this.useRedis();
    if (useRedisCache) {
      const key = this.getPasswordChangeOTPKey(userId);
      await this.redisService.set(key, otp, ttlSeconds);
    } else {
      // Fallback to in-memory
      const otpExpiresAt = new Date();
      otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);
      this.passwordChangeOTPs.set(userId, {
        otp,
        expiresAt: otpExpiresAt,
      });
    }

    // Send OTP email
    await this.emailService.sendPasswordChangeOTP(employee.email, employee.full_name, otp);

    return {
      message: 'OTP sent successfully to your email',
    };
  }

  /**
   * Verify OTP and change password
   */
  async verifyPasswordChangeOTP(userId: number, otp: string, newPassword: string): Promise<{ message: string }> {
    const employee = await this.employeeRepository.findOne({ where: { id: userId } });
    if (!employee) {
      throw new NotFoundException('User not found');
    }

    // Retrieve stored OTP from Redis or in-memory
    const useRedisCache = await this.useRedis();
    let storedOTP: string | null = null;

    if (useRedisCache) {
      // Get OTP from Redis
      const key = this.getPasswordChangeOTPKey(userId);
      storedOTP = await this.redisService.get(key);
      
      if (!storedOTP) {
        throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
      }

      // Verify OTP
      if (storedOTP !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      // Delete OTP after successful verification
      await this.redisService.delete(key);
    } else {
      // Fallback to in-memory
      const otpData = this.passwordChangeOTPs.get(userId);
      if (!otpData) {
        throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
      }

      // Check expiration
      if (otpData.expiresAt < new Date()) {
        this.passwordChangeOTPs.delete(userId);
        throw new BadRequestException('OTP has expired. Please request a new OTP.');
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      // Delete OTP after successful verification
      this.passwordChangeOTPs.delete(userId);
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await this.employeeRepository.update(
      { id: userId },
      { password_hash: passwordHash }
    );

    // Remove used OTP
    this.passwordChangeOTPs.delete(userId);

    return {
      message: 'Password changed successfully',
    };
  }
}
