import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import {
  PermissionScheme,
  ProjectPermission,
  ProjectRole,
} from '../../database/entities/project-module/Permission.entity';
import { NotificationScheme, ProjectNotification } from '../../database/entities/project-module/Notification.entity';
import {
  WorkflowScheme,
  WorkflowSchemeMapping,
  Workflow,
  WorkflowStatus,
} from '../../database/entities/project-module/Workflow.entity';

@Injectable()
export class SchemeCloneService {
  constructor(
    @InjectRepository(PermissionScheme)
    private readonly permissionSchemeRepository: Repository<PermissionScheme>,
    @InjectRepository(ProjectPermission)
    private readonly projectPermissionRepository: Repository<ProjectPermission>,
    @InjectRepository(ProjectRole)
    private readonly projectRoleRepository: Repository<ProjectRole>,

    @InjectRepository(NotificationScheme)
    private readonly notificationSchemeRepository: Repository<NotificationScheme>,
    @InjectRepository(ProjectNotification)
    private readonly projectNotificationRepository: Repository<ProjectNotification>,

    @InjectRepository(WorkflowScheme)
    private readonly workflowSchemeRepository: Repository<WorkflowScheme>,
    @InjectRepository(WorkflowSchemeMapping)
    private readonly workflowSchemeMappingRepository: Repository<WorkflowSchemeMapping>,
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowStatus)
    private readonly workflowStatusRepository: Repository<WorkflowStatus>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Clone Permission Scheme
   */
  async clonePermissionScheme(
    sourceSchemeId: number,
    projectKey: string,
  ): Promise<PermissionScheme> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Load source scheme with relations
      const sourceScheme = await this.permissionSchemeRepository.findOne({
        where: { id: sourceSchemeId },
        relations: ['permissions', 'permissions.project_role'],
      });

      if (!sourceScheme) {
        throw new Error(`Permission Scheme with ID ${sourceSchemeId} not found`);
      }

      // 2. Create new scheme
      const newScheme = this.permissionSchemeRepository.create({
        scheme_name: `${projectKey} - Permission Scheme`,
        scheme_description: `Cloned from ${sourceScheme.scheme_name}`,
        is_default: false,
      });
      const savedScheme = await queryRunner.manager.save(newScheme);

      // 3. Clone roles first (nếu có)
      const roleMap = new Map<number, number>(); // old role id -> new role id

      if (sourceScheme.permissions) {
        // Get unique roles
        const uniqueRoles = new Map<number, ProjectRole>();
        for (const permission of sourceScheme.permissions) {
          if (permission.project_role && !uniqueRoles.has(permission.project_role.id)) {
            uniqueRoles.set(permission.project_role.id, permission.project_role);
          }
        }

        // Clone roles
        for (const [oldRoleId, oldRole] of uniqueRoles) {
          const newRole = this.projectRoleRepository.create({
            role_name: `${projectKey} - ${oldRole.role_name}`,
            role_description: oldRole.role_description,
            is_default: false,
            permission_scheme_id: savedScheme.id,
          });
          const savedRole = await queryRunner.manager.save(newRole);
          roleMap.set(oldRoleId, savedRole.id);
        }
      }

      // 4. Clone permissions
      if (sourceScheme.permissions) {
        const newPermissions = sourceScheme.permissions.map((permission) => {
          const newPermission = this.projectPermissionRepository.create({
            permission_scheme_id: savedScheme.id,
            action_key: permission.action_key,
            recipient_type: permission.recipient_type,
            project_role_id: permission.project_role_id
              ? roleMap.get(permission.project_role_id) || null
              : null,
            specific_employee_id: permission.specific_employee_id,
            group_name: permission.group_name,
          });
          return newPermission;
        });

        await queryRunner.manager.save(newPermissions);
      }

      await queryRunner.commitTransaction();
      return savedScheme;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clone Notification Scheme
   */
  async cloneNotificationScheme(
    sourceSchemeId: number,
    projectKey: string,
  ): Promise<NotificationScheme> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Load source scheme with notifications
      const sourceScheme = await this.notificationSchemeRepository.findOne({
        where: { id: sourceSchemeId },
      });

      if (!sourceScheme) {
        throw new Error(`Notification Scheme with ID ${sourceSchemeId} not found`);
      }

      // Load notifications separately
      const sourceNotifications = await this.projectNotificationRepository.find({
        where: { notification_scheme_id: sourceSchemeId },
      });

      // 2. Create new scheme
      const newScheme = this.notificationSchemeRepository.create({
        scheme_name: `${projectKey} - Notification Scheme`,
        scheme_description: `Cloned from ${sourceScheme.scheme_name}`,
      });
      const savedScheme = await queryRunner.manager.save(newScheme);

      // 3. Clone notifications
      if (sourceNotifications.length > 0) {
        const newNotifications = sourceNotifications.map((notification) =>
          this.projectNotificationRepository.create({
            notification_scheme_id: savedScheme.id,
            event_name: notification.event_name,
            recipient_type: notification.recipient_type,
            recipient_value: notification.recipient_value,
          }),
        );

        await queryRunner.manager.save(newNotifications);
      }

      await queryRunner.commitTransaction();
      return savedScheme;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clone Workflow Scheme (chỉ clone mappings, không clone workflows)
   */
  async cloneWorkflowScheme(
    sourceSchemeId: number,
    projectKey: string,
  ): Promise<WorkflowScheme> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Load source scheme with mappings
      const sourceScheme = await this.workflowSchemeRepository.findOne({
        where: { id: sourceSchemeId },
      });

      if (!sourceScheme) {
        throw new Error(`Workflow Scheme with ID ${sourceSchemeId} not found`);
      }

      // Load mappings separately
      const sourceMappings = await this.workflowSchemeMappingRepository.find({
        where: { workflow_scheme_id: sourceSchemeId },
      });

      // 2. Create new scheme
      const newScheme = this.workflowSchemeRepository.create({
        scheme_name: `${projectKey} - Workflow Scheme`,
        scheme_description: `Cloned from ${sourceScheme.scheme_name}`,
      });
      const savedScheme = await queryRunner.manager.save(newScheme);

      // 3. Clone mappings (workflows remain shared)
      if (sourceMappings.length > 0) {
        const newMappings = sourceMappings.map((mapping) => ({
          workflow_scheme_id: savedScheme.id,
          issue_type_id: mapping.issue_type_id,
          workflow_id: mapping.workflow_id, // Same workflow, not cloned
        }));

        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(WorkflowSchemeMapping)
          .values(newMappings)
          .execute();
      }

      await queryRunner.commitTransaction();
      return savedScheme;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clone all schemes for a new project
   */
  async cloneAllSchemes(
    permissionSchemeId: number,
    notificationSchemeId: number,
    workflowSchemeId: number,
    projectKey: string,
  ): Promise<{
    permissionScheme: PermissionScheme;
    notificationScheme: NotificationScheme;
    workflowScheme: WorkflowScheme;
  }> {
    const [permissionScheme, notificationScheme, workflowScheme] = await Promise.all([
      this.clonePermissionScheme(permissionSchemeId, projectKey),
      this.cloneNotificationScheme(notificationSchemeId, projectKey),
      this.cloneWorkflowScheme(workflowSchemeId, projectKey),
    ]);

    return {
      permissionScheme,
      notificationScheme,
      workflowScheme,
    };
  }

  /**
   * Assign creator to Admin role in the new project
   */
  async assignCreatorToAdminRole(
    projectId: number,
    permissionSchemeId: number,
    creatorUserId: number,
  ): Promise<void> {
    // Find Admin role in the cloned permission scheme
    const adminRole = await this.projectRoleRepository.findOne({
      where: {
        permission_scheme_id: permissionSchemeId,
        role_name: Like('%Admin%'), // Find role with "Admin" in name
      },
    });

    if (!adminRole) {
      // If no Admin role found, try to find the first role as fallback
      const firstRole = await this.projectRoleRepository.findOne({
        where: { permission_scheme_id: permissionSchemeId },
        order: { id: 'ASC' },
      });

      if (!firstRole) {
        throw new Error('No roles found in the cloned permission scheme');
      }

      // Assign to first role if no Admin role exists
      await this.assignUserToRole(projectId, firstRole.id, creatorUserId, creatorUserId);
      return;
    }

    // Assign creator to Admin role
    await this.assignUserToRole(projectId, adminRole.id, creatorUserId, creatorUserId);
  }

  /**
   * Helper method to assign user to role
   */
  private async assignUserToRole(
    projectId: number,
    roleId: number,
    employeeId: number,
    assignedBy: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Check if assignment already exists
      const existing = await queryRunner.manager
        .createQueryBuilder()
        .select()
        .from('project_role_assignments', 'pra')
        .where('pra.employee_id = :employeeId', { employeeId })
        .andWhere('pra.project_id = :projectId', { projectId })
        .getRawOne();

      if (!existing) {
        // Insert new role assignment
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('project_role_assignments')
          .values({
            employee_id: employeeId,
            project_id: projectId,
            project_role_id: roleId,
            assigned_by_employee_id: assignedBy,
            assigned_at: new Date(),
          })
          .execute();
      }
    } finally {
      await queryRunner.release();
    }
  }
}