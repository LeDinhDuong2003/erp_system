import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Issue } from '../../database/entities/project-module/Issue.entity';
import { Employee } from '../../database/entities/Employee.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { WorkflowStatus } from '../../database/entities/project-module/Workflow.entity';
import { ProjectNotification, NotificationScheme } from '../../database/entities/project-module/Notification.entity';
import { EmailTemplates, IssueEmailData } from './email.templates';
import { EMAIL_QUEUE, EmailJob } from './email.processor';

export enum NotificationEvent {
  ISSUE_CREATED = 'Issue Created',
  ISSUE_UPDATED = 'Issue Updated',
  ISSUE_ASSIGNED = 'Issue Assigned',
  ISSUE_COMMENTED = 'Issue Commented',
  ISSUE_STATUS_CHANGED = 'Issue Status Changed',
  ISSUE_RESOLVED = 'Issue Resolved',
  ISSUE_CLOSED = 'Issue Closed',
  WORK_LOGGED = 'Work Logged',
}

export enum RecipientType {
  REPORTER = 'Reporter',
  ASSIGNEE = 'Assignee',
  WATCHER = 'Watcher',
  PROJECT_LEAD = 'Project Lead',
}

@Injectable()
export class IssueNotificationService {
  private readonly logger = new Logger(IssueNotificationService.name);

  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(ProjectNotification)
    private readonly projectNotificationRepository: Repository<ProjectNotification>,

    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue<EmailJob>,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Lấy danh sách người nhận email dựa trên notification scheme và event
   */
  private async getRecipients(
    issue: Issue,
    project: Project,
    eventName: NotificationEvent,
  ): Promise<Set<string>> {
    const recipients = new Set<string>();

    // Lấy notification scheme của project
    const notifications = await this.projectNotificationRepository.find({
      where: {
        notification_scheme_id: project.notification_scheme_id,
        event_name: eventName,
      },
    });

    for (const notification of notifications) {
      switch (notification.recipient_type) {
        case RecipientType.REPORTER:
          if (issue.reporter?.email) {
            recipients.add(issue.reporter.email);
          }
          break;

        case RecipientType.ASSIGNEE:
          if (issue.assignees) {
            issue.assignees.forEach(assignee => {
              if (assignee.email) recipients.add(assignee.email);
            });
          }
          break;

        case RecipientType.WATCHER:
          if (issue.watchers) {
            issue.watchers.forEach(watcher => {
              if (watcher.email) recipients.add(watcher.email);
            });
          }
          break;

        case RecipientType.PROJECT_LEAD:
          if (project.lead_employee?.email) {
            recipients.add(project.lead_employee.email);
          }
          break;
      }
    }

    return recipients;
  }

  /**
   * Tạo issue email data từ issue entity
   */
  private async buildIssueEmailData(issueId: number): Promise<IssueEmailData> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: [
        'project',
        'reporter',
        'assignees',
        'issue_type',
        'current_status',
      ],
    });

    if (!issue) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    const project = await this.projectRepository.findOne({
      where: { id: issue.project_id },
      relations: ['lead_employee'],
    });

    if (!project) {
      throw new Error(`Project with ID ${issue.project_id} not found`);
    }

    return {
      issueCode: issue.issue_code,
      issueId: issue.id,
      summary: issue.summary,
      description: issue.description || undefined,
      reporter: {
        name: `${issue.reporter.first_name} ${issue.reporter.last_name}`,
        email: issue.reporter.email,
      },
      assignees: issue.assignees?.map(a => ({
        name: `${a.first_name} ${a.last_name}`,
        email: a.email,
      })),
      status: issue.current_status.status_name,
      projectKey: project.project_key,
      projectName: project.project_name,
      frontendUrl: this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    };
  }

  /**
   * Gửi notification khi issue được tạo
   */
  async notifyIssueCreated(issueId: number): Promise<void> {
    try {
      const issue = await this.issueRepository.findOne({
        where: { id: issueId },
        relations: ['project', 'reporter', 'assignees', 'watchers', 'current_status'],
      });

      if (!issue) {
        this.logger.warn(`Issue ${issueId} not found for notification`);
        return;
      }

      const project = await this.projectRepository.findOne({
        where: { id: issue.project_id },
        relations: ['lead_employee'],
      });

      if (!project) {
        this.logger.warn(`Project ${issue.project_id} not found for notification`);
        return;
      }

      const recipients = await this.getRecipients(issue, project, NotificationEvent.ISSUE_CREATED);

      if (recipients.size === 0) {
        this.logger.log(`No recipients found for issue ${issue.issue_code} creation notification`);
        return;
      }

      const emailData = await this.buildIssueEmailData(issueId);
      const { subject, html } = EmailTemplates.issueCreated(emailData);

      // Add email jobs to queue
      for (const recipient of recipients) {
        await this.emailQueue.add('send-email', {
          to: recipient,
          subject,
          html,
          context: {
            event: NotificationEvent.ISSUE_CREATED,
            issueId,
            issueCode: issue.issue_code,
          },
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        });
      }

      this.logger.log(
        `Queued ${recipients.size} email(s) for issue ${issue.issue_code} creation notification`
      );
    } catch (error) {
      this.logger.error(`Failed to notify issue creation for issue ${issueId}:`, error);
    }
  }

  /**
   * Gửi notification khi issue được assign
   */
  async notifyIssueAssigned(
    issueId: number,
    assigneeId: number,
    assignedById: number,
  ): Promise<void> {
    try {
      const issue = await this.issueRepository.findOne({
        where: { id: issueId },
        relations: ['project', 'reporter', 'assignees', 'current_status'],
      });

      if (!issue) return;

      const assignee = await this.employeeRepository.findOne({
        where: { id: assigneeId },
      });

      const assignedBy = await this.employeeRepository.findOne({
        where: { id: assignedById },
      });

      if (!assignee || !assignedBy) return;

      const emailData = await this.buildIssueEmailData(issueId);
      const { subject, html } = EmailTemplates.issueAssigned({
        ...emailData,
        assignedBy: `${assignedBy.first_name} ${assignedBy.last_name}`,
      });

      await this.emailQueue.add('send-email', {
        to: assignee.email,
        subject,
        html,
        context: {
          event: NotificationEvent.ISSUE_ASSIGNED,
          issueId,
          assigneeId,
        },
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      this.logger.log(`Queued email for issue ${issue.issue_code} assignment to ${assignee.email}`);
    } catch (error) {
      this.logger.error(`Failed to notify issue assignment:`, error);
    }
  }

  /**
   * Gửi notification khi status thay đổi
   */
  async notifyStatusChanged(
    issueId: number,
    oldStatusId: number,
    newStatusId: number,
    changedById: number,
  ): Promise<void> {
    try {
      const issue = await this.issueRepository.findOne({
        where: { id: issueId },
        relations: ['project', 'reporter', 'assignees', 'watchers'],
      });

      if (!issue) return;

      const project = await this.projectRepository.findOne({
        where: { id: issue.project_id },
        relations: ['lead_employee'],
      });

      if (!project) return;

      const [oldStatus, newStatus, changedBy] = await Promise.all([
        this.issueRepository.manager.findOne(WorkflowStatus, { where: { id: oldStatusId } }),
        this.issueRepository.manager.findOne(WorkflowStatus, { where: { id: newStatusId } }),
        this.employeeRepository.findOne({ where: { id: changedById } }),
      ]);

      if (!oldStatus || !newStatus || !changedBy) return;

      const recipients = await this.getRecipients(issue, project, NotificationEvent.ISSUE_STATUS_CHANGED);

      if (recipients.size === 0) return;

      const emailData = await this.buildIssueEmailData(issueId);
      const { subject, html } = EmailTemplates.issueStatusChanged({
        ...emailData,
        oldStatus: oldStatus.status_name,
        newStatus: newStatus.status_name,
        changedBy: `${changedBy.first_name} ${changedBy.last_name}`,
      });

      for (const recipient of recipients) {
        await this.emailQueue.add('send-email', {
          to: recipient,
          subject,
          html,
          context: {
            event: NotificationEvent.ISSUE_STATUS_CHANGED,
            issueId,
            oldStatusId,
            newStatusId,
          },
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }

      this.logger.log(
        `Queued ${recipients.size} email(s) for issue ${issue.issue_code} status change notification`
      );
    } catch (error) {
      this.logger.error(`Failed to notify status change:`, error);
    }
  }

  /**
   * Gửi notification khi có comment mới
   */
  async notifyIssueCommented(
    issueId: number,
    commenterId: number,
    comment: string,
  ): Promise<void> {
    try {
      const issue = await this.issueRepository.findOne({
        where: { id: issueId },
        relations: ['project', 'reporter', 'assignees', 'watchers'],
      });

      if (!issue) return;

      const project = await this.projectRepository.findOne({
        where: { id: issue.project_id },
        relations: ['lead_employee'],
      });

      if (!project) return;

      const commenter = await this.employeeRepository.findOne({
        where: { id: commenterId },
      });

      if (!commenter) return;

      const recipients = await this.getRecipients(issue, project, NotificationEvent.ISSUE_COMMENTED);

      // Remove commenter from recipients (don't notify yourself)
      recipients.delete(commenter.email);

      if (recipients.size === 0) return;

      const emailData = await this.buildIssueEmailData(issueId);
      const { subject, html } = EmailTemplates.issueCommented({
        ...emailData,
        commenter: `${commenter.first_name} ${commenter.last_name}`,
        comment,
      });

      for (const recipient of recipients) {
        await this.emailQueue.add('send-email', {
          to: recipient,
          subject,
          html,
          context: {
            event: NotificationEvent.ISSUE_COMMENTED,
            issueId,
            commenterId,
          },
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }

      this.logger.log(
        `Queued ${recipients.size} email(s) for issue ${issue.issue_code} comment notification`
      );
    } catch (error) {
      this.logger.error(`Failed to notify comment:`, error);
    }
  }

  /**
   * Gửi notification khi issue được update
   */
  async notifyIssueUpdated(
    issueId: number,
    updatedById: number,
    changes: Array<{ field: string; oldValue: string; newValue: string }>,
  ): Promise<void> {
    try {
      const issue = await this.issueRepository.findOne({
        where: { id: issueId },
        relations: ['project', 'reporter', 'assignees', 'watchers'],
      });

      if (!issue) return;

      const project = await this.projectRepository.findOne({
        where: { id: issue.project_id },
        relations: ['lead_employee'],
      });

      if (!project) return;

      const updatedBy = await this.employeeRepository.findOne({
        where: { id: updatedById },
      });

      if (!updatedBy) return;

      const recipients = await this.getRecipients(issue, project, NotificationEvent.ISSUE_UPDATED);

      if (recipients.size === 0) return;

      const emailData = await this.buildIssueEmailData(issueId);
      const { subject, html } = EmailTemplates.issueUpdated({
        ...emailData,
        updatedBy: `${updatedBy.first_name} ${updatedBy.last_name}`,
        changes,
      });

      for (const recipient of recipients) {
        await this.emailQueue.add('send-email', {
          to: recipient,
          subject,
          html,
          context: {
            event: NotificationEvent.ISSUE_UPDATED,
            issueId,
            updatedById,
          },
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }

      this.logger.log(
        `Queued ${recipients.size} email(s) for issue ${issue.issue_code} update notification`
      );
    } catch (error) {
      this.logger.error(`Failed to notify issue update:`, error);
    }
  }

  /**
   * Lấy thống kê queue
   */
  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}