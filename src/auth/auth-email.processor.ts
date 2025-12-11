import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from '../common/services/email.service';

export const AUTH_EMAIL_QUEUE = 'auth-email-queue';

export interface AuthEmailJob {
  type: 'verification' | 'password-change-otp' | 'login-otp';
  email: string;
  fullName: string;
  data: {
    token?: string; // For verification
    otp?: string; // For OTP emails
  };
}

@Processor(AUTH_EMAIL_QUEUE)
export class AuthEmailProcessor {
  private readonly logger = new Logger(AuthEmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-verification-email')
  async handleVerificationEmail(job: Job<AuthEmailJob>) {
    this.logger.log(`Processing verification email job ${job.id} to ${job.data.email}`);
    
    try {
      if (!job.data.data.token) {
        throw new Error('Verification token is required');
      }

      await this.emailService.sendVerificationEmail(
        job.data.email,
        job.data.fullName,
        job.data.data.token,
      );
      
      return { success: true, recipient: job.data.email, type: 'verification' };
    } catch (error: any) {
      this.logger.error(`Failed to send verification email in job ${job.id}:`, error);
      throw error; // Bull will retry based on configuration
    }
  }

  @Process('send-password-change-otp')
  async handlePasswordChangeOTP(job: Job<AuthEmailJob>) {
    this.logger.log(`Processing password change OTP job ${job.id} to ${job.data.email}`);
    
    try {
      if (!job.data.data.otp) {
        throw new Error('OTP is required');
      }

      await this.emailService.sendPasswordChangeOTP(
        job.data.email,
        job.data.fullName,
        job.data.data.otp,
      );
      
      return { success: true, recipient: job.data.email, type: 'password-change-otp' };
    } catch (error: any) {
      this.logger.error(`Failed to send password change OTP in job ${job.id}:`, error);
      throw error;
    }
  }

  @Process('send-login-otp')
  async handleLoginOTP(job: Job<AuthEmailJob>) {
    this.logger.log(`Processing login OTP job ${job.id} to ${job.data.email}`);
    
    try {
      if (!job.data.data.otp) {
        throw new Error('OTP is required');
      }

      await this.emailService.sendLoginOTP(
        job.data.email,
        job.data.fullName,
        job.data.data.otp,
      );
      
      return { success: true, recipient: job.data.email, type: 'login-otp' };
    } catch (error: any) {
      this.logger.error(`Failed to send login OTP in job ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<AuthEmailJob>) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name} for ${job.data.email}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<AuthEmailJob>, result: any) {
    this.logger.log(`Job ${job.id} completed successfully for ${job.data.email}`);
    this.logger.debug(`Result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job<AuthEmailJob>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
    this.logger.error(`Job data:`, job.data);
    
    // Log failed attempts
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts. Giving up.`);
    } else {
      this.logger.warn(`Job ${job.id} will be retried. Attempt ${job.attemptsMade} of ${job.opts.attempts || 3}`);
    }
  }
}

