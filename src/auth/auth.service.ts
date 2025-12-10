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
import { Employee, EmployeeStatus } from '../database/entities/Employee.entity';
import { RefreshToken } from '../database/entities/RefreshToken.entity';
import { EmailService } from '../common/services/email.service';

interface OTPData {
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  // In-memory OTP storage (use Redis in production)
  private passwordChangeOTPs = new Map<number, OTPData>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly emailService: EmailService,
  ) {
    // Cleanup expired OTPs every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [userId, otpData] of this.passwordChangeOTPs.entries()) {
        if (otpData.expiresAt < now) {
          this.passwordChangeOTPs.delete(userId);
        }
      }
    }, 5 * 60 * 1000);
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

    // Check if account is locked
    if (employee.locked_until && employee.locked_until > new Date()) {
      throw new ForbiddenException('Account is locked');
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
      const newFailedCount = employee.failed_login_count + 1;
      const maxAttempts = 5;
      const lockDuration = 30 * 60 * 1000; // 30 minutes

      await this.employeeRepository.update(
        { id: employee.id },
        {
          failed_login_count: newFailedCount,
          locked_until:
            newFailedCount >= maxAttempts
              ? new Date(Date.now() + lockDuration)
              : null,
        },
      );

      throw new UnauthorizedException('Invalid credentials');
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
    };
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

  async login(user: { id: number; username: string; email: string }) {
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
    const employee = await this.employeeRepository.findOne({
      where: { email_verification_token: token },
    });

    if (!employee) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (employee.is_verified) {
      throw new BadRequestException('Email already verified');
    }

    // Check token expiry (24 hours)
    if (employee.email_verification_token_created_at) {
      const tokenAge = Date.now() - new Date(employee.email_verification_token_created_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (tokenAge > twentyFourHours) {
        // Clear expired token
        await this.employeeRepository.update(
          { id: employee.id },
          {
            email_verification_token: null,
            email_verification_token_created_at: null,
          },
        );
        throw new BadRequestException('Verification token has expired. Please request a new verification email.');
      }
    }

    // Update employee to verified
    await this.employeeRepository.update(
      { id: employee.id },
      {
        is_verified: true,
        email_verified_at: new Date(),
        email_verification_token: null, // Clear token after verification
        email_verification_token_created_at: null,
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

    // Update token and set created_at (clear old token and timestamp)
    await this.employeeRepository.update(
      { id: employee.id },
      {
        email_verification_token: verificationToken,
        email_verification_token_created_at: new Date(),
      },
    );

    // Send email
    await this.emailService.sendVerificationEmail(
      employee.email,
      employee.full_name,
      verificationToken,
    );

    return {
      message: 'Verification email sent successfully',
      email: employee.email,
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
    
    // Store OTP in memory (use Redis in production)
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    this.passwordChangeOTPs.set(userId, {
      otp,
      expiresAt: otpExpiresAt,
    });

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

    // Retrieve stored OTP
    const storedOTP = this.passwordChangeOTPs.get(userId);
    if (!storedOTP) {
      throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
    }

    // Check expiration
    if (storedOTP.expiresAt < new Date()) {
      this.passwordChangeOTPs.delete(userId);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
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
