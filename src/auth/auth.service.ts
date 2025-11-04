import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeStatus } from '../database/entities/Employee.entity';
import { RefreshToken } from '../database/entities/RefreshToken.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

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
      id: employee.id.toString(),
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
    id: string;
    username: string;
    email: string;
  }) {
    const basePayload = {
      sub: user.id,
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

  async login(user: { id: string; username: string; email: string }) {
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

  async refresh(user: { id: string; username: string; email: string }) {
    return this.login(user);
  }

  async validateRefreshToken(userId: string, refreshToken: string) {
    const employeeId = userId.toString();

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
          id: employee.id.toString(),
          username: employee.username,
          email: employee.email,
        };
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async revoke(userId: string) {
    const employeeId = userId.toString();
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true })
      .where('employee_id = :employeeId AND revoked = false', { employeeId })
      .execute();
  }

  async revokeSpecificToken(userId: string, refreshToken: string) {
    const employeeId = userId.toString();

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
}
