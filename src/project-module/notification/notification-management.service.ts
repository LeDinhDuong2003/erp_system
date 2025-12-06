import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectNotification, NotificationScheme } from '../../database/entities/project-module/Notification.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import {
  CreateNotificationSchemeDto,
  UpdateNotificationSchemeDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  BulkAddRecipientsDto,
  BulkRemoveRecipientsDto,
  CloneNotificationSchemeDto,
} from './dto/notification-management.dto';

@Injectable()
export class NotificationManagementService {
  constructor(
    @InjectRepository(NotificationScheme)
    private readonly notificationSchemeRepository: Repository<NotificationScheme>,

    @InjectRepository(ProjectNotification)
    private readonly projectNotificationRepository: Repository<ProjectNotification>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  // ==================== NOTIFICATION SCHEMES ====================

  /**
   * Lấy tất cả notification schemes
   * SỬA: Load relations riêng để tránh lỗi TypeORM
   */
  async getAllSchemes(): Promise<NotificationScheme[]> {
    // Load schemes first
    const schemes = await this.notificationSchemeRepository.find({
      order: { id: 'ASC' },
    });

    // Manually load relations for each scheme
    for (const scheme of schemes) {
      // Load notifications
      const notifications = await this.projectNotificationRepository.find({
        where: { notification_scheme_id: scheme.id },
      });
      scheme.notifications = notifications;

      // Load projects using this scheme
      const projects = await this.projectRepository.find({
        where: { notification_scheme_id: scheme.id },
        select: ['id', 'project_name', 'project_key'],
      });
      scheme.projects = projects as any;
    }

    return schemes;
  }

  /**
   * Lấy chi tiết một notification scheme
   * SỬA: Load relations riêng
   */
  async getSchemeById(id: number): Promise<NotificationScheme> {
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${id} not found`);
    }

    // Manually load relations
    const notifications = await this.projectNotificationRepository.find({
      where: { notification_scheme_id: id },
    });
    scheme.notifications = notifications;

    const projects = await this.projectRepository.find({
      where: { notification_scheme_id: id },
      select: ['id', 'project_name', 'project_key'],
    });
    scheme.projects = projects as any;

    return scheme;
  }

  /**
   * Tạo notification scheme mới
   */
  async createScheme(dto: CreateNotificationSchemeDto): Promise<NotificationScheme> {
    // Check duplicate name
    const existing = await this.notificationSchemeRepository.findOne({
      where: { scheme_name: dto.scheme_name },
    });

    if (existing) {
      throw new ConflictException(`Notification Scheme with name "${dto.scheme_name}" already exists`);
    }

    const scheme = this.notificationSchemeRepository.create(dto);
    return this.notificationSchemeRepository.save(scheme);
  }

  /**
   * Update notification scheme
   */
  async updateScheme(id: number, dto: UpdateNotificationSchemeDto): Promise<NotificationScheme> {
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${id} not found`);
    }

    // Check duplicate name if updating name
    if (dto.scheme_name && dto.scheme_name !== scheme.scheme_name) {
      const existing = await this.notificationSchemeRepository.findOne({
        where: { scheme_name: dto.scheme_name },
      });

      if (existing) {
        throw new ConflictException(`Notification Scheme with name "${dto.scheme_name}" already exists`);
      }
    }

    Object.assign(scheme, dto);
    return this.notificationSchemeRepository.save(scheme);
  }

  /**
   * Xóa notification scheme
   */
  async deleteScheme(id: number): Promise<{ message: string }> {
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${id} not found`);
    }

    // Check if scheme is being used by any project
    const projectCount = await this.projectRepository.count({
      where: { notification_scheme_id: id },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        `Cannot delete scheme. It is being used by ${projectCount} project(s)`
      );
    }

    // Delete all notifications in this scheme first
    await this.projectNotificationRepository.delete({ notification_scheme_id: id });

    // Then delete the scheme
    await this.notificationSchemeRepository.delete(id);

    return { message: `Notification Scheme "${scheme.scheme_name}" deleted successfully` };
  }

  /**
   * Clone notification scheme
   */
  async cloneScheme(dto: CloneNotificationSchemeDto): Promise<NotificationScheme> {
    const sourceScheme = await this.getSchemeById(dto.source_scheme_id);

    // Check duplicate name
    const existing = await this.notificationSchemeRepository.findOne({
      where: { scheme_name: dto.new_scheme_name },
    });

    if (existing) {
      throw new ConflictException(`Notification Scheme with name "${dto.new_scheme_name}" already exists`);
    }

    // Create new scheme
    const newScheme = this.notificationSchemeRepository.create({
      scheme_name: dto.new_scheme_name,
      scheme_description: dto.new_scheme_description || `Cloned from ${sourceScheme.scheme_name}`,
    });

    const savedScheme = await this.notificationSchemeRepository.save(newScheme);

    // Clone all notifications
    const notifications = sourceScheme.notifications.map(notification =>
      this.projectNotificationRepository.create({
        notification_scheme_id: savedScheme.id,
        event_name: notification.event_name,
        recipient_type: notification.recipient_type,
        recipient_value: notification.recipient_value,
      })
    );

    await this.projectNotificationRepository.save(notifications);

    return this.getSchemeById(savedScheme.id);
  }

  // ==================== NOTIFICATION EVENTS ====================

  /**
   * Lấy danh sách tất cả events có sẵn
   */
  async getAllAvailableEvents(): Promise<string[]> {
    // Lấy tất cả event names unique từ database
    const events = await this.projectNotificationRepository
      .createQueryBuilder('notification')
      .select('DISTINCT notification.event_name', 'event_name')
      .getRawMany();

    const eventNames = events.map(e => e.event_name);

    // Merge với predefined events (để đảm bảo có đủ)
    const predefinedEvents = [
      'Issue Created',
      'Issue Updated',
      'Issue Assigned',
      'Issue Commented',
      'Issue Status Changed',
      'Issue Resolved',
      'Issue Closed',
      'Work Logged',
    ];

    return [...new Set([...eventNames, ...predefinedEvents])].sort();
  }

  /**
   * Lấy danh sách recipient types có sẵn
   */
  getAvailableRecipientTypes(): string[] {
    return [
      'Reporter',
      'Assignee',
      'Watcher',
      'Project Lead',
    ];
  }

  /**
   * Lấy notifications theo event name
   */
  async getNotificationsByEvent(schemeId: number, eventName: string): Promise<ProjectNotification[]> {
    return this.projectNotificationRepository.find({
      where: {
        notification_scheme_id: schemeId,
        event_name: eventName,
      },
      order: { id: 'ASC' },
    });
  }

  /**
   * Lấy tất cả events trong một scheme với recipients grouped
   */
  async getSchemeEventsGrouped(schemeId: number): Promise<any> {
    // Validate scheme exists
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${schemeId} not found`);
    }

    const notifications = await this.projectNotificationRepository.find({
      where: { notification_scheme_id: schemeId },
      order: { event_name: 'ASC', id: 'ASC' },
    });

    // Group by event_name
    const grouped = notifications.reduce((acc, notification) => {
      if (!acc[notification.event_name]) {
        acc[notification.event_name] = {
          event_name: notification.event_name,
          recipients: [],
        };
      }

      acc[notification.event_name].recipients.push({
        id: notification.id,
        recipient_type: notification.recipient_type,
        recipient_value: notification.recipient_value,
      });

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  // ==================== NOTIFICATION RULES ====================

  /**
   * Tạo notification rule mới
   */
  async createNotificationRule(dto: CreateNotificationRuleDto): Promise<ProjectNotification> {
    // Validate scheme exists
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id: dto.notification_scheme_id },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${dto.notification_scheme_id} not found`);
    }

    // Check if rule already exists
    const whereCondition: any = {
      notification_scheme_id: dto.notification_scheme_id,
      event_name: dto.event_name,
      recipient_type: dto.recipient_type,
    };

    if (dto.recipient_value === null || dto.recipient_value === undefined) {
      whereCondition.recipient_value = IsNull();
    } else {
      whereCondition.recipient_value = dto.recipient_value;
    }

    const existing = await this.projectNotificationRepository.findOne({
      where: whereCondition,
    });

    if (existing) {
      throw new ConflictException('This notification rule already exists');
    }

    const notification = this.projectNotificationRepository.create(dto);
    return this.projectNotificationRepository.save(notification);
  }

  /**
   * Update notification rule
   */
  async updateNotificationRule(id: number, dto: UpdateNotificationRuleDto): Promise<ProjectNotification> {
    const notification = await this.projectNotificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification rule with ID ${id} not found`);
    }

    Object.assign(notification, dto);
    return this.projectNotificationRepository.save(notification);
  }

  /**
   * Xóa notification rule
   */
  async deleteNotificationRule(id: number): Promise<{ message: string }> {
    const notification = await this.projectNotificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification rule with ID ${id} not found`);
    }

    await this.projectNotificationRepository.delete(id);
    return { message: 'Notification rule deleted successfully' };
  }

  /**
   * Bulk add recipients to an event
   */
  async bulkAddRecipients(dto: BulkAddRecipientsDto): Promise<ProjectNotification[]> {
    // Validate scheme exists
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id: dto.notification_scheme_id },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${dto.notification_scheme_id} not found`);
    }

    const notifications: ProjectNotification[] = [];

    for (const recipientType of dto.recipient_types) {
      // Check if already exists
      const existing = await this.projectNotificationRepository.findOne({
        where: {
          notification_scheme_id: dto.notification_scheme_id,
          event_name: dto.event_name,
          recipient_type: recipientType,
          recipient_value: IsNull(),
        },
      });

      if (!existing) {
        const notification = this.projectNotificationRepository.create({
          notification_scheme_id: dto.notification_scheme_id,
          event_name: dto.event_name,
          recipient_type: recipientType,
          recipient_value: null,
        });

        notifications.push(notification);
      }
    }

    if (notifications.length > 0) {
      return this.projectNotificationRepository.save(notifications);
    }

    return [];
  }

  /**
   * Bulk remove recipients from an event
   */
  async bulkRemoveRecipients(dto: BulkRemoveRecipientsDto): Promise<{ message: string; deleted: number }> {
    const result = await this.projectNotificationRepository
      .createQueryBuilder()
      .delete()
      .from(ProjectNotification)
      .where('notification_scheme_id = :schemeId', { schemeId: dto.notification_scheme_id })
      .andWhere('event_name = :eventName', { eventName: dto.event_name })
      .andWhere('recipient_type IN (:...recipientTypes)', { recipientTypes: dto.recipient_types })
      .execute();

    return {
      message: 'Recipients removed successfully',
      deleted: result.affected || 0,
    };
  }

  // ==================== PROJECT ASSIGNMENTS ====================

  /**
   * Assign notification scheme to project
   */
  async assignSchemeToProject(projectId: number, schemeId: number): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${schemeId} not found`);
    }

    project.notification_scheme_id = schemeId;
    return this.projectRepository.save(project);
  }

  /**
   * Get projects using a notification scheme
   */
  async getProjectsUsingScheme(schemeId: number): Promise<Project[]> {
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new NotFoundException(`Notification Scheme with ID ${schemeId} not found`);
    }

    return this.projectRepository.find({
      where: { notification_scheme_id: schemeId },
      order: { project_name: 'ASC' },
    });
  }

  // ==================== STATISTICS ====================

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(): Promise<any> {
    const [totalSchemes, totalNotifications, totalProjects] = await Promise.all([
      this.notificationSchemeRepository.count(),
      this.projectNotificationRepository.count(),
      this.projectRepository.count(),
    ]);

    // Count notifications per scheme
    const notificationsPerScheme = await this.projectNotificationRepository
      .createQueryBuilder('notification')
      .select('notification.notification_scheme_id', 'scheme_id')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.notification_scheme_id')
      .getRawMany();

    // Count notifications per event
    const notificationsPerEvent = await this.projectNotificationRepository
      .createQueryBuilder('notification')
      .select('notification.event_name', 'event_name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.event_name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return {
      totalSchemes,
      totalNotifications,
      totalProjects,
      notificationsPerScheme,
      notificationsPerEvent,
    };
  }
}