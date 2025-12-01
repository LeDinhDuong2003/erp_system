import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from './email.service';

export const EMAIL_QUEUE = 'email-queue';

export interface EmailJob {
  to: string | string[];
  subject: string;
  html: string;
  context?: Record<string, any>; // Metadata for tracking
}

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);
    
    try {
      await this.emailService.sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.html,
      });
      
      return { success: true, recipient: job.data.to };
    } catch (error: any) {
      this.logger.error(`Failed to send email in job ${job.id}:`, error);
      throw error; // Bull will retry based on configuration
    }
  }

  @Process('send-bulk-email')
  async handleSendBulkEmail(job: Job<EmailJob>) {
    this.logger.log(`Processing bulk email job ${job.id} to ${Array.isArray(job.data.to) ? job.data.to.length : 1} recipients`);
    
    try {
      const recipients = Array.isArray(job.data.to) ? job.data.to : [job.data.to];
      
      const result = await this.emailService.sendBulkEmail(
        recipients,
        job.data.subject,
        job.data.html,
      );
      
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to send bulk email in job ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<EmailJob>) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<EmailJob>, result: any) {
    this.logger.log(`Job ${job.id} completed successfully`);
    this.logger.debug(`Result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job<EmailJob>, error: Error) {
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