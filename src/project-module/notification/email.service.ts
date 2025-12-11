import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.createTransporter();
  }

  /**
   * Tạo Nodemailer transporter
   */
  private createTransporter() {
    try {
      const mailHost = this.configService.get<string>('MAIL_HOST');
      const mailUser = this.configService.get<string>('MAIL_USER');
      const mailPass = this.configService.get<string>('MAIL_PASSWORD');

      // Only create transporter if SMTP is configured
      if (!mailHost || !mailUser || !mailPass) {
        this.logger.warn('⚠️  SMTP not configured. Email sending will be disabled.');
        this.logger.warn('   Set MAIL_HOST, MAIL_USER, and MAIL_PASSWORD environment variables to enable email.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: mailHost,
        port: this.configService.get<number>('MAIL_PORT') || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: mailUser,
          pass: mailPass,
        },
        // Skip verification on creation to avoid connection errors during startup
        // Verification will happen when actually sending email
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection asynchronously (non-blocking)
      // Don't throw error if verification fails - just log as warning
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.warn('⚠️  Email transporter verification failed (emails may still work):', error.message);
          this.logger.warn('   This is usually fine if SMTP server is not available during startup.');
        } else {
          this.logger.log('✅ Email transporter is ready to send emails');
        }
      });
    } catch (error) {
      this.logger.warn('⚠️  Failed to create email transporter (emails will be disabled):', error);
      // Don't throw error - allow app to continue without email functionality
    }
  }

  /**
   * Gửi email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('⚠️  Email transporter not available. Email not sent.');
      return false;
    }

    try {
      const fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'ERP System';
      const fromAddress = this.configService.get<string>('MAIL_FROM') || this.configService.get<string>('MAIL_USER') || '';

      const mailOptions = {
        from: `${fromName} <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully to ${options.to}`);
      this.logger.debug(`Message ID: ${info.messageId}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      // Don't throw error - return false instead
      return false;
    }
  }

  /**
   * Gửi email đến nhiều người nhận
   */
  async sendBulkEmail(recipients: string[], subject: string, html: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const email of recipients) {
      try {
        await this.sendEmail({ to: email, subject, html });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          email,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Bulk email sent: ${results.success} success, ${results.failed} failed out of ${recipients.length} total`
    );

    return results;
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('⚠️  Email transporter not available.');
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('✅ Email connection test successful');
      return true;
    } catch (error) {
      this.logger.warn('⚠️  Email connection test failed:', error);
      return false;
    }
  }
}