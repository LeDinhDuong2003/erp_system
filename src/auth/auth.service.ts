import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface InMemoryUser {
  id: number;
  username: string;
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private readonly users: InMemoryUser[] = [];
  private readonly userIdToRefreshHash = new Map<number, string>();

  constructor(private readonly jwtService: JwtService) {
    const seedPassword = 'password123';
    const seedHash = bcrypt.hashSync(seedPassword, 10);
    this.users.push({ id: 1, username: 'admin', passwordHash: seedHash });
  }

  async validateUser(username: string, password: string) {
    const user = this.users.find((u) => u.username === username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { id: user.id, username: user.username };
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

  private async generateTokens(user: { id: number; username: string }) {
    const basePayload = { sub: user.id, username: user.username };
    const accessExpiresIn = this.parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60);
    const refreshExpiresIn = this.parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60);
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

  async login(user: { id: number; username: string }) {
    const { accessToken, refreshToken } = await this.generateTokens(user);
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    this.userIdToRefreshHash.set(user.id, refreshHash);
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refresh(user: { id: number; username: string }) {
    return this.login(user);
  }

  async validateRefreshToken(userId: number, refreshToken: string) {
    const storedHash = this.userIdToRefreshHash.get(userId);
    if (!storedHash) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const isMatch = await bcrypt.compare(refreshToken, storedHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, username: user.username };
  }

  async revoke(userId: number) {
    this.userIdToRefreshHash.delete(userId);
  }
}


