import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionScheme } from '../../database/entities/project-module/Permission.entity';
import { NotificationScheme } from '../../database/entities/project-module/Notification.entity';
import { WorkflowScheme } from '../../database/entities/project-module/Workflow.entity';

@Injectable()
export class SchemeListService {
  constructor(
    @InjectRepository(PermissionScheme)
    private readonly permissionSchemeRepository: Repository<PermissionScheme>,

    @InjectRepository(NotificationScheme)
    private readonly notificationSchemeRepository: Repository<NotificationScheme>,

    @InjectRepository(WorkflowScheme)
    private readonly workflowSchemeRepository: Repository<WorkflowScheme>,
  ) {}

  /**
   * Lấy danh sách tất cả Permission Schemes
   */
  async getAllPermissionSchemes(): Promise<PermissionScheme[]> {
    return this.permissionSchemeRepository.find({
      select: ['id', 'scheme_name', 'scheme_description', 'is_default'],
      order: { is_default: 'DESC', scheme_name: 'ASC' },
    });
  }

  /**
   * Lấy danh sách tất cả Notification Schemes
   */
  async getAllNotificationSchemes(): Promise<NotificationScheme[]> {
    return this.notificationSchemeRepository.find({
      select: ['id', 'scheme_name', 'scheme_description'],
      order: { scheme_name: 'ASC' },
    });
  }

  /**
   * Lấy danh sách tất cả Workflow Schemes
   */
  async getAllWorkflowSchemes(): Promise<WorkflowScheme[]> {
    return this.workflowSchemeRepository.find({
      select: ['id', 'scheme_name', 'scheme_description'],
      order: { scheme_name: 'ASC' },
    });
  }

  /**
   * Lấy tất cả schemes cùng lúc (cho dropdown)
   */
  async getAllSchemes(): Promise<{
    permissionSchemes: PermissionScheme[];
    notificationSchemes: NotificationScheme[];
    workflowSchemes: WorkflowScheme[];
  }> {
    const [permissionSchemes, notificationSchemes, workflowSchemes] = await Promise.all([
      this.getAllPermissionSchemes(),
      this.getAllNotificationSchemes(),
      this.getAllWorkflowSchemes(),
    ]);

    return {
      permissionSchemes,
      notificationSchemes,
      workflowSchemes,
    };
  }

  /**
   * Lấy default schemes (cho quick create)
   */
  async getDefaultSchemes(): Promise<{
    permissionScheme: PermissionScheme | null;
    notificationScheme: NotificationScheme | null;
    workflowScheme: WorkflowScheme | null;
  }> {
    // Get default permission scheme
    const permissionScheme = await this.permissionSchemeRepository.findOne({
      where: { is_default: true },
      select: ['id', 'scheme_name', 'scheme_description', 'is_default'],
    });

    // Get first notification scheme as default
    const notificationScheme = await this.notificationSchemeRepository.findOne({
      select: ['id', 'scheme_name', 'scheme_description'],
      order: { id: 'ASC' },
    });

    // Get first workflow scheme as default
    const workflowScheme = await this.workflowSchemeRepository.findOne({
      select: ['id', 'scheme_name', 'scheme_description'],
      order: { id: 'ASC' },
    });

    return {
      permissionScheme,
      notificationScheme,
      workflowScheme,
    };
  }

  /**
   * Lấy thông tin chi tiết một Permission Scheme
   */
  async getPermissionSchemeDetails(id: number): Promise<PermissionScheme | null> {
    return this.permissionSchemeRepository.findOne({
      where: { id },
      relations: ['permissions', 'permissions.project_role'],
    });
  }

  /**
   * Lấy thông tin chi tiết một Notification Scheme
   */
  async getNotificationSchemeDetails(id: number): Promise<NotificationScheme | null> {
    const scheme = await this.notificationSchemeRepository.findOne({
      where: { id },
    });

    if (!scheme) return null;

    // Load notifications separately (như đã fix trước đó)
    const notifications = await this.notificationSchemeRepository.manager
      .getRepository('project_notifications')
      .createQueryBuilder('notification')
      .where('notification.notification_scheme_id = :schemeId', { schemeId: id })
      .getMany();

    return {
      ...scheme,
      notifications: notifications as any,
    };
  }

  /**
   * Lấy thông tin chi tiết một Workflow Scheme
   */
  async getWorkflowSchemeDetails(id: number): Promise<WorkflowScheme | null> {
    const scheme = await this.workflowSchemeRepository.findOne({
      where: { id },
    });

    if (!scheme) return null;

    // Load mappings separately
    const mappings = await this.workflowSchemeRepository.manager
      .getRepository('workflow_scheme_mappings')
      .createQueryBuilder('mapping')
      .where('mapping.workflow_scheme_id = :schemeId', { schemeId: id })
      .getMany();

    return {
      ...scheme,
      mappings: mappings as any,
    };
  }
}