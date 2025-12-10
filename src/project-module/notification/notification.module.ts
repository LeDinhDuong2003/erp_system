import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailProcessor, EMAIL_QUEUE } from './email.processor';
import { IssueNotificationService } from './issue-notification.service';
import { Issue } from '../../database/entities/project-module/Issue.entity';
import { Employee } from '../../database/entities/Employee.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { ProjectNotification, NotificationScheme } from '../../database/entities/project-module/Notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationManagementController } from './notification-management.controller';
import { NotificationManagementService } from './notification-management.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
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
    TypeOrmModule.forFeature([
      Issue,
      Employee,
      Project,
      ProjectNotification,
      NotificationScheme,
    ]),
  ],
  controllers: [
    NotificationController,
    NotificationManagementController,
  ],
  providers: [
    EmailService,
    EmailProcessor,
    IssueNotificationService,
    NotificationManagementService,
  ],
  exports: [
    IssueNotificationService,
    EmailService,
    NotificationManagementService,
  ],
})
export class NotificationModule {}