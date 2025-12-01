import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectNotification as Notification,
  NotificationScheme,
} from '../../entities/project-module/Notification.entity';

@Injectable()
export class NotificationSeederService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSeederService.name);

  // Tên Notification Scheme mặc định
  private readonly defaultSchemeName = 'Default Notification Scheme';

  // Danh sách các notification events mặc định
  private readonly defaultNotifications = [
    {
      event_name: 'Issue Created',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Created',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Created',
      recipient_type: 'Project Lead',
      recipient_value: null,
    },
    {
      event_name: 'Issue Updated',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Updated',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Updated',
      recipient_type: 'Watcher',
      recipient_value: null,
    },
    {
      event_name: 'Issue Assigned',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Assigned',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Commented',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Commented',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Commented',
      recipient_type: 'Watcher',
      recipient_value: null,
    },
    {
      event_name: 'Issue Status Changed',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Status Changed',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Status Changed',
      recipient_type: 'Watcher',
      recipient_value: null,
    },
    {
      event_name: 'Issue Resolved',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Resolved',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Issue Resolved',
      recipient_type: 'Project Lead',
      recipient_value: null,
    },
    {
      event_name: 'Issue Closed',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Issue Closed',
      recipient_type: 'Assignee',
      recipient_value: null,
    },
    {
      event_name: 'Work Logged',
      recipient_type: 'Reporter',
      recipient_value: null,
    },
    {
      event_name: 'Work Logged',
      recipient_type: 'Project Lead',
      recipient_value: null,
    },
  ];

  constructor(
    @InjectRepository(NotificationScheme)
    private readonly notificationSchemeRepository: Repository<NotificationScheme>,

    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Chạy seeder ngay khi module được khởi tạo.
   */
  async onModuleInit() {
    await this.seedNotificationSetup();
  }

  /**
   * Seed notification scheme và notifications
   */
  async seedNotificationSetup() {
    this.logger.log('Starting notification setup seed...');
    
    try {
      // B1: Kiểm tra và tạo Notification Scheme
      const defaultScheme = await this.seedDefaultScheme();
      if (!defaultScheme) return;

      // B2: Kiểm tra và tạo Notifications
      await this.seedDefaultNotifications(defaultScheme.id);
      
      this.logger.log('✅ Notification setup completed successfully');
    } catch (error) {
      this.logger.error('Error in seedNotificationSetup:', error);
    }
  }

  /**
   * Tạo Notification Scheme mặc định nếu chưa có.
   */
  private async seedDefaultScheme(): Promise<NotificationScheme | null> {
    const existingScheme = await this.notificationSchemeRepository.findOne({
      where: { scheme_name: this.defaultSchemeName },
    });

    if (existingScheme) {
      this.logger.log(`Notification Scheme "${this.defaultSchemeName}" already exists.`);
      return existingScheme;
    }

    const newScheme = this.notificationSchemeRepository.create({
      scheme_name: this.defaultSchemeName,
      scheme_description: 'Default notification scheme for all projects',
    });

    const savedScheme = await this.notificationSchemeRepository.save(newScheme);
    this.logger.log(`✅ Created default Notification Scheme: ${savedScheme.scheme_name}`);
    return savedScheme;
  }

  /**
   * Tạo các Notifications mặc định cho Scheme
   */
  private async seedDefaultNotifications(schemeId: number): Promise<void> {
    // Kiểm tra xem đã có notifications cho scheme này chưa
    const existingNotifications = await this.notificationRepository.find({
      where: { notification_scheme_id: schemeId },
    });

    if (existingNotifications.length > 0) {
      this.logger.log(
        `Notifications for Scheme ID ${schemeId} already exist. Skipping notification seed.`,
      );
      return;
    }

    // Tạo tất cả notifications
    const notifications = this.defaultNotifications.map((notification) =>
      this.notificationRepository.create({
        notification_scheme_id: schemeId,
        event_name: notification.event_name,
        recipient_type: notification.recipient_type,
        recipient_value: notification.recipient_value,
      }),
    );

    const savedNotifications = await this.notificationRepository.save(notifications);
    this.logger.log(
      `✅ Seeded ${savedNotifications.length} default Notifications for scheme ID ${schemeId}`,
    );
  }
}