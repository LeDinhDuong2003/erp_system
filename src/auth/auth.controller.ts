import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'User login', description: 'Authenticate user and get JWT tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account is locked or inactive' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: 'Get user profile', description: 'Get current authenticated user information' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        userId: '1',
        username: 'superadmin',
        email: 'superadmin@system.local',
        employee_code: 'SUPER_ADMIN_001',
        full_name: 'Super Administrator',
        roles: [
          {
            id: '1',
            code: 'SUPER_ADMIN',
            name: 'Super Administrator',
            description: 'Full system access',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    return this.authService.refresh({
      id: req.user.userId,
      username: req.user.username,
      email: req.user.email,
    });
  }

  @ApiOperation({
    summary: 'User logout',
    description: 'Revoke all refresh tokens for the current user',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtRefreshGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req: any) {
    await this.authService.revoke(req.user.userId);
  }

  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify email address using verification token (GET - for email links)',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Get('verify-email')
  async verifyEmailGet(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @ApiOperation({
    summary: 'Verify email (POST)',
    description: 'Verify email address using verification token (POST - for API calls)',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Post('verify-email')
  async verifyEmailPost(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resend verification email to user',
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Post('password-change/request-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request OTP for password change' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async requestPasswordChangeOTP(@Request() req: any) {
    return this.authService.requestPasswordChangeOTP(req.user.id);
  }

  @Post('password-change/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify OTP and change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async verifyPasswordChangeOTP(
    @Request() req: any,
    @Body() body: { otp: string; new_password: string },
  ) {
    return this.authService.verifyPasswordChangeOTP(req.user.id, body.otp, body.new_password);
  }
}


