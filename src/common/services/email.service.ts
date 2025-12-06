import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Generate email verification token
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send verification email
   * Supports both SMTP (nodemailer) and console logging for development
   */
  async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationToken: string,
  ): Promise<void> {
    // Get FRONTEND URL (not backend URL) - default to port 3001 for Next.js
    // Priority: FRONTEND_URL env variable > default localhost:3001
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;
    
    // Log để debug
    this.logger.debug(`Frontend URL: ${frontendUrl}`);
    this.logger.debug(`Verification URL: ${verifyUrl}`);

    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      // Try to send via SMTP if configured
      try {
        // Dynamic import to avoid errors if nodemailer is not installed
        let nodemailer: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          nodemailer = require('nodemailer');
        } catch (importError) {
          this.logger.warn(`⚠️  nodemailer is not installed. Install it with: npm install nodemailer @types/nodemailer`);
          this.logger.warn(`⚠️  Falling back to console logging.`);
          // Fall through to console logging
          return;
        }
        
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || smtpUser,
          to: email,
          subject: 'Xác thực tài khoản - ERP System',
          html: this.getVerificationEmailTemplate(fullName, verifyUrl),
        });

        this.logger.log(`✅ Verification email sent successfully to ${email}`);
        return;
      } catch (error: any) {
        this.logger.error(`❌ Failed to send email via SMTP: ${error.message}`);
        this.logger.warn(`⚠️  Falling back to console logging. Please check SMTP configuration.`);
        // Fall through to console logging
      }
    }

    // Fallback: Log to console (for development)
    this.logger.warn(`📧 [EMAIL VERIFICATION - DEVELOPMENT MODE]`);
    this.logger.warn(`   To: ${email}`);
    this.logger.warn(`   Subject: Xác thực tài khoản - ERP System`);
    this.logger.warn(`   Verification URL: ${verifyUrl}`);
    this.logger.warn(`   ⚠️  To enable real email sending, configure SMTP settings in .env:`);
    this.logger.warn(`   SMTP_HOST=smtp.gmail.com`);
    this.logger.warn(`   SMTP_PORT=587`);
    this.logger.warn(`   SMTP_USER=your-email@gmail.com`);
    this.logger.warn(`   SMTP_PASS=your-app-password`);
    this.logger.warn(`   SMTP_FROM=noreply@yourcompany.com`);
  }

  /**
   * Get verification email HTML template
   */
  private getVerificationEmailTemplate(fullName: string, verifyUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f3f4f6;
            padding: 20px;
          }
          .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .header-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .greeting strong {
            color: #2563eb;
            font-weight: 600;
          }
          .instruction {
            color: #4b5563;
            margin-bottom: 30px;
            font-size: 16px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button { 
            display: inline-block;
            padding: 18px 36px;
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 17px;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 6px rgba(30, 58, 138, 0.4);
            transition: all 0.3s ease;
            text-align: center;
            border: none;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(30, 58, 138, 0.5);
            background: linear-gradient(135deg, #1e3a8a 0%, #1e3a8a 100%);
          }
          .divider {
            text-align: center;
            margin: 30px 0;
            position: relative;
          }
          .divider::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: #e5e7eb;
          }
          .divider span {
            background: white;
            padding: 0 15px;
            color: #6b7280;
            font-size: 14px;
            position: relative;
          }
          .link-container {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .link-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .link-text {
            word-break: break-all;
            color: #2563eb;
            font-size: 14px;
            font-family: 'Courier New', monospace;
          }
          .note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .note strong {
            color: #92400e;
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
          }
          .note-text {
            color: #78350f;
            font-size: 14px;
          }
          .disclaimer {
            color: #6b7280;
            font-size: 14px;
            margin-top: 25px;
            padding-top: 25px;
            border-top: 1px solid #e5e7eb;
          }
          .footer { 
            background: #f9fafb;
            text-align: center; 
            padding: 25px 30px;
            color: #6b7280; 
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
          }
          .footer-text {
            margin-bottom: 8px;
          }
          .footer-company {
            color: #2563eb;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="header-icon">✉️</div>
            <h1>Xác thực tài khoản</h1>
            <p style="opacity: 0.9; font-size: 14px; margin-top: 8px;">ERP System</p>
          </div>
          <div class="content">
            <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
            <p class="instruction">
              Cảm ơn bạn đã đăng ký tài khoản trong hệ thống ERP của chúng tôi. 
              Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào nút bên dưới.
            </p>
            
            <div class="button-container">
              <a href="${verifyUrl}" class="button">Xác thực tài khoản</a>
            </div>

            <div class="divider">
              <span>Hoặc</span>
            </div>

            <div class="link-container">
              <div class="link-label">Copy và dán link này vào trình duyệt:</div>
              <div class="link-text">${verifyUrl}</div>
            </div>

            <div class="note">
              <strong>⏰ Lưu ý quan trọng</strong>
              <div class="note-text">Link xác thực này sẽ hết hạn sau <strong>24 giờ</strong> kể từ khi được gửi. Vui lòng xác thực sớm để tránh mất quyền truy cập.</div>
            </div>

            <p class="disclaimer">
              Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này. 
              Tài khoản sẽ không được kích hoạt nếu không xác thực email.
            </p>
          </div>
          <div class="footer">
            <p class="footer-text">Email này được gửi tự động từ hệ thống ERP.</p>
            <p class="footer-text">Vui lòng không trả lời email này.</p>
            <p style="margin-top: 12px;">
              <span class="footer-company">ERP System</span> - Quản lý doanh nghiệp thông minh
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

