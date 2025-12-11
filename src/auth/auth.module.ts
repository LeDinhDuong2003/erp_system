import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { RefreshToken } from '../database/entities/RefreshToken.entity';
import { EmailService } from '../common/services/email.service';
import { RedisService } from '../common/services/redis.service';
import { AuthEmailProcessor, AUTH_EMAIL_QUEUE } from './auth-email.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Role, RefreshToken]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: { expiresIn: 3600 },
    }),
    BullModule.registerQueue({
      name: AUTH_EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy, EmailService, RedisService, AuthEmailProcessor],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}


