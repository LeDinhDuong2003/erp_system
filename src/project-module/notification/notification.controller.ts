import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { IssueNotificationService } from './issue-notification.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly issueNotificationService: IssueNotificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Test email connection
   */
  @Get('test-connection')
  async testEmailConnection() {
    const isConnected = await this.emailService.testConnection();
    return {
      success: isConnected,
      message: isConnected 
        ? 'Email service is configured correctly' 
        : 'Email service configuration failed',
    };
  }

  /**
   * Send test email
   */
  @Post('test-email')
  async sendTestEmail(@Body() body: { to: string }) {
    try {
      await this.emailService.sendEmail({
        to: body.to,
        subject: 'Test Email from ERP System',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from your ERP System.</p>
          <p>If you received this, your email configuration is working correctly!</p>
        `,
      });

      return {
        success: true,
        message: `Test email sent to ${body.to}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to send test email',
        error: error.message,
      };
    }
  }

  /**
   * Get queue statistics
   */
  @Get('queue-stats')
  async getQueueStats() {
    return this.issueNotificationService.getQueueStats();
  }

  /**
   * Manually trigger issue created notification
   */
  @Post('issue/:id/created')
  async notifyIssueCreated(@Param('id', ParseIntPipe) id: number) {
    await this.issueNotificationService.notifyIssueCreated(id);
    return {
      success: true,
      message: `Issue created notification queued for issue ${id}`,
    };
  }

  /**
   * Manually trigger issue assigned notification
   */
  @Post('issue/:id/assigned')
  async notifyIssueAssigned(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { assigneeId: number; assignedById: number },
  ) {
    await this.issueNotificationService.notifyIssueAssigned(
      id,
      body.assigneeId,
      body.assignedById,
    );
    return {
      success: true,
      message: `Issue assigned notification queued for issue ${id}`,
    };
  }

  /**
   * Manually trigger status changed notification
   */
  @Post('issue/:id/status-changed')
  async notifyStatusChanged(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { oldStatusId: number; newStatusId: number; changedById: number },
  ) {
    await this.issueNotificationService.notifyStatusChanged(
      id,
      body.oldStatusId,
      body.newStatusId,
      body.changedById,
    );
    return {
      success: true,
      message: `Status changed notification queued for issue ${id}`,
    };
  }

  /**
   * Manually trigger comment notification
   */
  @Post('issue/:id/commented')
  async notifyIssueCommented(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { commenterId: number; comment: string },
  ) {
    await this.issueNotificationService.notifyIssueCommented(
      id,
      body.commenterId,
      body.comment,
    );
    return {
      success: true,
      message: `Comment notification queued for issue ${id}`,
    };
  }
}