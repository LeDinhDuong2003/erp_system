import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PermissionScheme,
  ProjectRole,
  ProjectPermission,
  PermissionScope,
} from '../../entities/project-module/Permission.entity';

/**
 * Danh sách các action keys (permissions) trong hệ thống
 * Dựa trên các quyền phổ biến trong Jira
 */
const PERMISSION_ACTIONS = {
  // Project Administration
  ADMINISTER_PROJECT: 'administer_project',
  
  // Issue Operations
  CREATE_ISSUE: 'create_issue',
  EDIT_ISSUE: 'edit_issue',
  DELETE_ISSUE: 'delete_issue',
  ASSIGN_ISSUE: 'assign_issue',
  TRANSITION_ISSUE: 'transition_issue',
  
  // Issue Details
  EDIT_ISSUE_DESCRIPTION: 'edit_issue_description',
  EDIT_ISSUE_SUMMARY: 'edit_issue_summary',
  EDIT_ISSUE_PRIORITY: 'edit_issue_priority',
  EDIT_ISSUE_LABELS: 'edit_issue_labels',
  
  // Comments
  ADD_COMMENTS: 'add_comments',
  EDIT_ALL_COMMENTS: 'edit_all_comments',
  EDIT_OWN_COMMENTS: 'edit_own_comments',
  DELETE_ALL_COMMENTS: 'delete_all_comments',
  DELETE_OWN_COMMENTS: 'delete_own_comments',
  
  // Attachments
  CREATE_ATTACHMENTS: 'create_attachments',
  DELETE_ALL_ATTACHMENTS: 'delete_all_attachments',
  DELETE_OWN_ATTACHMENTS: 'delete_own_attachments',
  
  // Work Logs
  WORK_ON_ISSUES: 'work_on_issues',
  EDIT_ALL_WORKLOGS: 'edit_all_worklogs',
  EDIT_OWN_WORKLOGS: 'edit_own_worklogs',
  DELETE_ALL_WORKLOGS: 'delete_all_worklogs',
  DELETE_OWN_WORKLOGS: 'delete_own_worklogs',
  
  // Issue Links
  LINK_ISSUES: 'link_issues',
  
  // Sprint Management
  MANAGE_SPRINTS: 'manage_sprints',
  
  // Epic Management
  MANAGE_EPICS: 'manage_epics',
  
  // Project Configuration
  VIEW_PROJECT: 'view_project',
  BROWSE_PROJECT: 'browse_project',
  VIEW_DEV_TOOLS: 'view_dev_tools',
  VIEW_VOTERS_WATCHERS: 'view_voters_watchers',
  MANAGE_WATCHERS: 'manage_watchers',
  
  // Workflow
  VIEW_WORKFLOW: 'view_workflow',
  EDIT_WORKFLOW: 'edit_workflow',
};

/**
 * Định nghĩa 3 role mặc định với các permissions tương ứng
 */
const DEFAULT_ROLES = {
  ADMIN: {
    role_name: 'Administrator',
    role_description: 'Full access to all project features and settings',
    is_default: true,
    permissions: [
      // Admin có tất cả các quyền
      ...Object.values(PERMISSION_ACTIONS),
    ],
  },
  MEMBER: {
    role_name: 'Member',
    role_description: 'Can create, edit, and manage issues',
    is_default: true,
    permissions: [
      // Project View
      PERMISSION_ACTIONS.VIEW_PROJECT,
      PERMISSION_ACTIONS.BROWSE_PROJECT,
      PERMISSION_ACTIONS.VIEW_DEV_TOOLS,
      PERMISSION_ACTIONS.VIEW_VOTERS_WATCHERS,
      PERMISSION_ACTIONS.MANAGE_WATCHERS,
      PERMISSION_ACTIONS.VIEW_WORKFLOW,
      
      // Issue Operations
      PERMISSION_ACTIONS.CREATE_ISSUE,
      PERMISSION_ACTIONS.EDIT_ISSUE,
      PERMISSION_ACTIONS.ASSIGN_ISSUE,
      PERMISSION_ACTIONS.TRANSITION_ISSUE,
      PERMISSION_ACTIONS.LINK_ISSUES,
      
      // Issue Details
      PERMISSION_ACTIONS.EDIT_ISSUE_DESCRIPTION,
      PERMISSION_ACTIONS.EDIT_ISSUE_SUMMARY,
      PERMISSION_ACTIONS.EDIT_ISSUE_PRIORITY,
      PERMISSION_ACTIONS.EDIT_ISSUE_LABELS,
      
      // Comments
      PERMISSION_ACTIONS.ADD_COMMENTS,
      PERMISSION_ACTIONS.EDIT_OWN_COMMENTS,
      PERMISSION_ACTIONS.DELETE_OWN_COMMENTS,
      
      // Attachments
      PERMISSION_ACTIONS.CREATE_ATTACHMENTS,
      PERMISSION_ACTIONS.DELETE_OWN_ATTACHMENTS,
      
      // Work Logs
      PERMISSION_ACTIONS.WORK_ON_ISSUES,
      PERMISSION_ACTIONS.EDIT_OWN_WORKLOGS,
      PERMISSION_ACTIONS.DELETE_OWN_WORKLOGS,
      
      // Sprint & Epic
      PERMISSION_ACTIONS.MANAGE_SPRINTS,
      PERMISSION_ACTIONS.MANAGE_EPICS,
    ],
  },
  VIEWER: {
    role_name: 'Viewer',
    role_description: 'Read-only access to project',
    is_default: true,
    permissions: [
      // Chỉ có quyền xem
      PERMISSION_ACTIONS.VIEW_PROJECT,
      PERMISSION_ACTIONS.BROWSE_PROJECT,
      PERMISSION_ACTIONS.VIEW_DEV_TOOLS,
      PERMISSION_ACTIONS.VIEW_VOTERS_WATCHERS,
      PERMISSION_ACTIONS.VIEW_WORKFLOW,
    ],
  },
};

@Injectable()
export class PermissionSeederService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeederService.name);

  constructor(
    @InjectRepository(PermissionScheme)
    private readonly permissionSchemeRepository: Repository<PermissionScheme>,
    
    @InjectRepository(ProjectRole)
    private readonly projectRoleRepository: Repository<ProjectRole>,
    
    @InjectRepository(ProjectPermission)
    private readonly projectPermissionRepository: Repository<ProjectPermission>,
  ) {}

  /**
   * Chạy seeder ngay khi module được khởi tạo
   */
  async onModuleInit() {
    await this.seedPermissionSetup();
  }

  async seedPermissionSetup() {
    this.logger.log('Starting permission setup seed...');
    
    try {
      // 1. Tạo Default Permission Scheme
      const defaultScheme = await this.seedDefaultPermissionScheme();
      if (!defaultScheme) return;

      // 2. Tạo 3 Project Roles mặc định (Admin, Member, Viewer)
      const roles = await this.seedDefaultProjectRoles();

      // 3. Tạo Project Permissions cho từng role trong scheme
      await this.seedProjectPermissions(defaultScheme.id, roles);

      this.logger.log('✅ Permission setup completed successfully');
    } catch (error) {
      this.logger.error('Error in seedPermissionSetup:', error);
    }
  }

  /**
   * Tạo Default Permission Scheme
   */
  private async seedDefaultPermissionScheme(): Promise<PermissionScheme | null> {
    const schemeName = 'Default Permission Scheme';
    
    const existingScheme = await this.permissionSchemeRepository.findOne({
      where: { scheme_name: schemeName },
    });

    if (existingScheme) {
      this.logger.log(`Permission Scheme "${schemeName}" already exists.`);
      return existingScheme;
    }

    const newScheme = this.permissionSchemeRepository.create({
      scheme_name: schemeName,
      scheme_description: 'Default permission scheme for all projects',
      is_default: true,
    });

    const savedScheme = await this.permissionSchemeRepository.save(newScheme);
    this.logger.log(`✅ Created default Permission Scheme: ${savedScheme.scheme_name}`);
    return savedScheme;
  }

  /**
   * Tạo 3 Project Roles mặc định (Admin, Member, Viewer)
   */
  private async seedDefaultProjectRoles(): Promise<Map<string, ProjectRole>> {
    const rolesMap = new Map<string, ProjectRole>();

    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const existingRole = await this.projectRoleRepository.findOne({
        where: { role_name: roleData.role_name },
      });

      if (existingRole) {
        this.logger.log(`Project Role "${roleData.role_name}" already exists.`);
        rolesMap.set(roleKey, existingRole);
        continue;
      }

      const newRole = this.projectRoleRepository.create({
        role_name: roleData.role_name,
        role_description: roleData.role_description,
        is_default: roleData.is_default,
      });

      const savedRole = await this.projectRoleRepository.save(newRole);
      this.logger.log(`✅ Created Project Role: ${savedRole.role_name}`);
      rolesMap.set(roleKey, savedRole);
    }

    return rolesMap;
  }

  /**
   * Tạo Project Permissions cho từng role trong scheme
   */
  private async seedProjectPermissions(
    schemeId: number,
    rolesMap: Map<string, ProjectRole>,
  ): Promise<void> {
    // Kiểm tra xem đã có permissions cho scheme này chưa
    const existingPermissions = await this.projectPermissionRepository.find({
      where: { permission_scheme_id: schemeId },
    });

    if (existingPermissions.length > 0) {
      this.logger.log(`Permissions for scheme ID ${schemeId} already exist. Skipping seed.`);
      return;
    }

    const permissionsToCreate: ProjectPermission[] = [];

    // Tạo permissions cho từng role
    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const projectRole = rolesMap.get(roleKey);
      
      if (!projectRole) {
        this.logger.warn(`Project Role for ${roleKey} not found. Skipping permissions.`);
        continue;
      }

      // Tạo permission cho mỗi action của role
      for (const actionKey of roleData.permissions) {
        const permission = this.projectPermissionRepository.create({
          permission_scheme_id: schemeId,
          action_key: actionKey,
          recipient_type: PermissionScope.ROLE,
          project_role_id: projectRole.id,
          specific_employee_id: null,
          group_name: null,
        });

        permissionsToCreate.push(permission);
      }
    }

    // Bulk insert
    if (permissionsToCreate.length > 0) {
      await this.projectPermissionRepository.save(permissionsToCreate);
      this.logger.log(`✅ Created ${permissionsToCreate.length} project permissions`);
    }
  }
}