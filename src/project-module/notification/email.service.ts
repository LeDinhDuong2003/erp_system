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
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('MAIL_HOST'),
        port: this.configService.get<number>('MAIL_PORT'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get<string>('MAIL_USER'),
          pass: this.configService.get<string>('MAIL_PASSWORD'),
        },
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Email transporter verification failed:', error);
        } else {
          this.logger.log('✅ Email transporter is ready to send emails');
        }
      });
    } catch (error) {
      this.logger.error('Failed to create email transporter:', error);
      throw error;
    }
  }

  /**
   * Gửi email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
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
      throw error;
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
    try {
      await this.transporter.verify();
      this.logger.log('✅ Email connection test successful');
      return true;
    } catch (error) {
      this.logger.error('❌ Email connection test failed:', error);
      return false;
    }
  }
}