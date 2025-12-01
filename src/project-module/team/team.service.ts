import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import {
    ProjectRoleAssignment,
    ProjectRole,
} from '../../database/entities/project-module/Permission.entity';
import { Employee } from '../../database/entities/Employee.entity';
import { Project } from '../../database/entities/project-module/Project.entity';
import { AddMemberDto, AddMultipleMembersDto } from './dto/add-member.dto';
import { AssignRoleDto, BulkAssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class TeamService {
    constructor(
        @InjectRepository(ProjectRoleAssignment)
        private readonly roleAssignmentRepository: Repository<ProjectRoleAssignment>,

        @InjectRepository(ProjectRole)
        private readonly projectRoleRepository: Repository<ProjectRole>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,

        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,

        private readonly dataSource: DataSource,
    ) {}

    /**
     * Helper: Kiểm tra số lượng Administrators trong project
     * Trả về số lượng administrators hiện tại
     */
    private async countAdministrators(
        projectId: number,
        manager?: any,
    ): Promise<number> {
        const repository = manager
            ? manager.getRepository(ProjectRoleAssignment)
            : this.roleAssignmentRepository;

        // Get Administrator role
        const adminRole = await (manager
            ? manager.getRepository(ProjectRole)
            : this.projectRoleRepository
        ).findOne({
            where: { role_name: 'Administrator' },
        });

        if (!adminRole) {
            throw new NotFoundException('Administrator role not found in system');
        }

        // Count administrators in this project
        const count = await repository.count({
            where: {
                project_id: projectId,
                project_role_id: adminRole.id,
            },
        });

        return count;
    }

    /**
     * Helper: Kiểm tra xem employee có phải là Administrator không
     */
    private async isAdministrator(
        projectId: number,
        employeeId: number,
        manager?: any,
    ): Promise<boolean> {
        const repository = manager
            ? manager.getRepository(ProjectRoleAssignment)
            : this.roleAssignmentRepository;

        const adminRole = await (manager
            ? manager.getRepository(ProjectRole)
            : this.projectRoleRepository
        ).findOne({
            where: { role_name: 'Administrator' },
        });

        if (!adminRole) {
            return false;
        }

        const assignment = await repository.findOne({
            where: {
                project_id: projectId,
                employee_id: employeeId,
                project_role_id: adminRole.id,
            },
        });

        return !!assignment;
    }

    /**
     * Lấy danh sách tất cả thành viên trong project
     */
    async getProjectMembers(projectId: number): Promise<any[]> {
        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const members = await this.roleAssignmentRepository.find({
            where: { project_id: projectId },
            relations: ['employee', 'project_role', 'assigned_by_employee'],
            order: { assigned_at: 'DESC' },
        });

        return members.map((member) => ({
            employee_id: member.employee_id,
            employee: {
                id: member.employee.id,
                username: member.employee.username,
                email: member.employee.email,
                full_name: member.employee.full_name,
                first_name: member.employee.first_name,
                last_name: member.employee.last_name,
                avatar_url: member.employee.avatar_url,
                status: member.employee.status,
            },
            project_role: {
                id: member.project_role.id,
                role_name: member.project_role.role_name,
                role_description: member.project_role.role_description,
            },
            assigned_by: member.assigned_by_employee
                ? {
                      id: member.assigned_by_employee.id,
                      full_name: member.assigned_by_employee.full_name,
                  }
                : null,
            assigned_at: member.assigned_at,
        }));
    }

    /**
     * Lấy thông tin chi tiết một thành viên trong project
     */
    async getMemberDetail(projectId: number, employeeId: number): Promise<any> {
        const member = await this.roleAssignmentRepository.findOne({
            where: {
                project_id: projectId,
                employee_id: employeeId,
            },
            relations: ['employee', 'project_role', 'assigned_by_employee'],
        });

        if (!member) {
            throw new NotFoundException(
                `Employee ${employeeId} is not a member of project ${projectId}`,
            );
        }

        return {
            employee_id: member.employee_id,
            employee: {
                id: member.employee.id,
                username: member.employee.username,
                email: member.employee.email,
                full_name: member.employee.full_name,
                first_name: member.employee.first_name,
                last_name: member.employee.last_name,
                avatar_url: member.employee.avatar_url,
                phone: member.employee.phone,
                department: member.employee.department,
                position: member.employee.position,
                status: member.employee.status,
            },
            project_role: {
                id: member.project_role.id,
                role_name: member.project_role.role_name,
                role_description: member.project_role.role_description,
            },
            assigned_by: member.assigned_by_employee
                ? {
                      id: member.assigned_by_employee.id,
                      full_name: member.assigned_by_employee.full_name,
                  }
                : null,
            assigned_at: member.assigned_at,
        };
    }

    /**
     * Thêm một thành viên vào project
     */
    async addMember(
        projectId: number,
        addMemberDto: AddMemberDto,
        assignedBy: number,
    ): Promise<ProjectRoleAssignment> {
        const { employee_id, project_role_id } = addMemberDto;

        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Validate employee exists
        const employee = await this.employeeRepository.findOne({
            where: { id: employee_id },
        });
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${employee_id} not found`);
        }

        // Validate project role exists
        const projectRole = await this.projectRoleRepository.findOne({
            where: { id: project_role_id },
        });
        if (!projectRole) {
            throw new NotFoundException(
                `Project role with ID ${project_role_id} not found`,
            );
        }

        // Check if employee is already a member
        const existingMember = await this.roleAssignmentRepository.findOne({
            where: {
                project_id: projectId,
                employee_id: employee_id,
            },
        });

        if (existingMember) {
            throw new ConflictException(
                `Employee ${employee_id} is already a member of project ${projectId}`,
            );
        }

        // Create role assignment
        const roleAssignment = this.roleAssignmentRepository.create({
            employee_id,
            project_id: projectId,
            project_role_id,
            assigned_by_employee_id: assignedBy,
            assigned_at: new Date(),
        });

        return await this.roleAssignmentRepository.save(roleAssignment);
    }

    /**
     * Thêm nhiều thành viên vào project cùng lúc
     */
    async addMultipleMembers(
        projectId: number,
        addMultipleMembersDto: AddMultipleMembersDto,
        assignedBy: number,
    ): Promise<any> {
        const { members } = addMultipleMembersDto;

        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const results: Array<{
            employee_id: number;
            success: boolean;
            error?: string;
        }> = [];

        await this.dataSource.transaction(async (manager) => {
            for (const memberDto of members) {
                try {
                    // Validate employee exists
                    const employee = await manager.findOne(Employee, {
                        where: { id: memberDto.employee_id },
                    });
                    if (!employee) {
                        results.push({
                            employee_id: memberDto.employee_id,
                            success: false,
                            error: `Employee with ID ${memberDto.employee_id} not found`,
                        });
                        continue;
                    }

                    // Validate project role exists
                    const projectRole = await manager.findOne(ProjectRole, {
                        where: { id: memberDto.project_role_id },
                    });
                    if (!projectRole) {
                        results.push({
                            employee_id: memberDto.employee_id,
                            success: false,
                            error: `Project role with ID ${memberDto.project_role_id} not found`,
                        });
                        continue;
                    }

                    // Check if already a member
                    const existingMember = await manager.findOne(ProjectRoleAssignment, {
                        where: {
                            project_id: projectId,
                            employee_id: memberDto.employee_id,
                        },
                    });

                    if (existingMember) {
                        results.push({
                            employee_id: memberDto.employee_id,
                            success: false,
                            error: 'Employee is already a member',
                        });
                        continue;
                    }

                    // Create role assignment
                    const roleAssignment = manager.create(ProjectRoleAssignment, {
                        employee_id: memberDto.employee_id,
                        project_id: projectId,
                        project_role_id: memberDto.project_role_id,
                        assigned_by_employee_id: assignedBy,
                        assigned_at: new Date(),
                    });

                    await manager.save(roleAssignment);

                    results.push({
                        employee_id: memberDto.employee_id,
                        success: true,
                    });
                } catch (error: any) {
                    results.push({
                        employee_id: memberDto.employee_id,
                        success: false,
                        error: error.message,
                    });
                }
            }
        });

        const successCount = results.filter((r) => r.success).length;

        return {
            message: `Added ${successCount} of ${members.length} members successfully`,
            total: members.length,
            success: successCount,
            failed: members.length - successCount,
            results,
        };
    }

    /**
     * Gán/thay đổi role cho một thành viên
     * ✅ UPDATED: Kiểm tra không được thay đổi Administrator cuối cùng thành role khác
     */
    async assignRole(
        projectId: number,
        employeeId: number,
        assignRoleDto: AssignRoleDto,
        assignedBy: number,
    ): Promise<ProjectRoleAssignment> {
        const { project_role_id } = assignRoleDto;

        // Validate member exists
        const member = await this.roleAssignmentRepository.findOne({
            where: {
                project_id: projectId,
                employee_id: employeeId,
            },
            relations: ['project_role'],
        });

        if (!member) {
            throw new NotFoundException(
                `Employee ${employeeId} is not a member of project ${projectId}`,
            );
        }

        // Validate new role exists
        const newRole = await this.projectRoleRepository.findOne({
            where: { id: project_role_id },
        });

        if (!newRole) {
            throw new NotFoundException(
                `Project role with ID ${project_role_id} not found`,
            );
        }

        // Check if it's the same role
        if (member.project_role_id === project_role_id) {
            throw new BadRequestException(
                `Employee already has role ${newRole.role_name}`,
            );
        }

        // ✅ NEW: Check if this would remove the last Administrator
        const isCurrentlyAdmin = await this.isAdministrator(projectId, employeeId);
        const isNewRoleAdmin = newRole.role_name === 'Administrator';

        if (isCurrentlyAdmin && !isNewRoleAdmin) {
            // Employee is currently Administrator and will be changed to non-admin
            const adminCount = await this.countAdministrators(projectId);

            if (adminCount <= 1) {
                throw new BadRequestException(
                    'Cannot change role of the last Administrator. Project must have at least one Administrator.',
                );
            }
        }

        // Update role
        await this.roleAssignmentRepository.update(
            {
                project_id: projectId,
                employee_id: employeeId,
            },
            {
                project_role_id,
                assigned_by_employee_id: assignedBy,
                assigned_at: new Date(),
            },
        );

        return (await this.roleAssignmentRepository.findOne({
            where: {
                project_id: projectId,
                employee_id: employeeId,
            },
            relations: ['employee', 'project_role', 'assigned_by_employee'],
        })) as ProjectRoleAssignment;
    }

    /**
     * Gán role cho nhiều thành viên cùng lúc
     * ✅ UPDATED: Kiểm tra không được thay đổi tất cả Administrators thành role khác
     */
    async bulkAssignRole(
        projectId: number,
        bulkAssignRoleDto: BulkAssignRoleDto,
        assignedBy: number,
    ): Promise<any> {
        const { employee_ids, project_role_id } = bulkAssignRoleDto;

        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Validate role exists
        const newRole = await this.projectRoleRepository.findOne({
            where: { id: project_role_id },
        });
        if (!newRole) {
            throw new NotFoundException(
                `Project role with ID ${project_role_id} not found`,
            );
        }

        const results: Array<{
            employee_id: number;
            success: boolean;
            error?: string;
        }> = [];

        await this.dataSource.transaction(async (manager) => {
            const isNewRoleAdmin = newRole.role_name === 'Administrator';
            const currentAdminCount = await this.countAdministrators(
                projectId,
                manager,
            );

            // ✅ NEW: Count how many current admins are in the list to be changed
            let adminsToChange = 0;
            if (!isNewRoleAdmin) {
                for (const employee_id of employee_ids) {
                    const isAdmin = await this.isAdministrator(
                        projectId,
                        employee_id,
                        manager,
                    );
                    if (isAdmin) {
                        adminsToChange++;
                    }
                }

                // Check if this would remove all administrators
                const remainingAdmins = currentAdminCount - adminsToChange;
                if (remainingAdmins < 1) {
                    throw new BadRequestException(
                        `Cannot change role of all Administrators. Project must have at least one Administrator. Current Administrators: ${currentAdminCount}, Attempting to change: ${adminsToChange}`,
                    );
                }
            }

            for (const employee_id of employee_ids) {
                try {
                    // Check if member exists
                    const member = await manager.findOne(ProjectRoleAssignment, {
                        where: {
                            project_id: projectId,
                            employee_id: employee_id,
                        },
                    });

                    if (!member) {
                        results.push({
                            employee_id,
                            success: false,
                            error: 'Employee is not a member of this project',
                        });
                        continue;
                    }

                    if (member.project_role_id === project_role_id) {
                        results.push({
                            employee_id,
                            success: false,
                            error: 'Employee already has this role',
                        });
                        continue;
                    }

                    // Update role
                    await manager.update(
                        ProjectRoleAssignment,
                        {
                            project_id: projectId,
                            employee_id: employee_id,
                        },
                        {
                            project_role_id,
                            assigned_by_employee_id: assignedBy,
                            assigned_at: new Date(),
                        },
                    );

                    results.push({
                        employee_id,
                        success: true,
                    });
                } catch (error: any) {
                    results.push({
                        employee_id,
                        success: false,
                        error: error.message,
                    });
                }
            }
        });

        const successCount = results.filter((r) => r.success).length;

        return {
            message: `Updated role for ${successCount} of ${employee_ids.length} members`,
            total: employee_ids.length,
            success: successCount,
            failed: employee_ids.length - successCount,
            results,
        };
    }

    /**
     * Xóa một thành viên khỏi project
     * ✅ UPDATED: Kiểm tra không được xóa Administrator cuối cùng
     */
    async removeMember(projectId: number, employeeId: number): Promise<any> {
        const member = await this.roleAssignmentRepository.findOne({
            where: {
                project_id: projectId,
                employee_id: employeeId,
            },
            relations: ['employee', 'project_role'],
        });

        if (!member) {
            throw new NotFoundException(
                `Employee ${employeeId} is not a member of project ${projectId}`,
            );
        }

        // Check if this is the project lead
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (project && project.lead_employee_id === employeeId) {
            throw new BadRequestException(
                'Cannot remove project lead. Please assign a new lead first.',
            );
        }

        // ✅ NEW: Check if this is the last Administrator
        const isAdmin = await this.isAdministrator(projectId, employeeId);
        if (isAdmin) {
            const adminCount = await this.countAdministrators(projectId);
            if (adminCount <= 1) {
                throw new BadRequestException(
                    'Cannot remove the last Administrator. Project must have at least one Administrator.',
                );
            }
        }

        await this.roleAssignmentRepository.delete({
            project_id: projectId,
            employee_id: employeeId,
        });

        return {
            message: 'Member removed successfully',
            employee: {
                id: member.employee.id,
                full_name: member.employee.full_name,
            },
            role: {
                id: member.project_role.id,
                role_name: member.project_role.role_name,
            },
        };
    }

    /**
     * Xóa nhiều thành viên khỏi project
     * ✅ UPDATED: Kiểm tra không được xóa tất cả Administrators
     */
    async removeMultipleMembers(
        projectId: number,
        employeeIds: number[],
    ): Promise<any> {
        // Validate project exists
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });
        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        const results: Array<{
            employee_id: number;
            success: boolean;
            error?: string;
        }> = [];

        await this.dataSource.transaction(async (manager) => {
            // ✅ NEW: Check how many administrators would be removed
            const currentAdminCount = await this.countAdministrators(
                projectId,
                manager,
            );

            let adminsToRemove = 0;
            for (const employee_id of employeeIds) {
                const isAdmin = await this.isAdministrator(
                    projectId,
                    employee_id,
                    manager,
                );
                if (isAdmin) {
                    adminsToRemove++;
                }
            }

            // Check if this would remove all administrators
            const remainingAdmins = currentAdminCount - adminsToRemove;
            if (remainingAdmins < 1) {
                throw new BadRequestException(
                    `Cannot remove all Administrators. Project must have at least one Administrator. Current Administrators: ${currentAdminCount}, Attempting to remove: ${adminsToRemove}`,
                );
            }

            for (const employee_id of employeeIds) {
                try {
                    // Check if member exists
                    const member = await manager.findOne(ProjectRoleAssignment, {
                        where: {
                            project_id: projectId,
                            employee_id: employee_id,
                        },
                    });

                    if (!member) {
                        results.push({
                            employee_id,
                            success: false,
                            error: 'Employee is not a member of this project',
                        });
                        continue;
                    }

                    // Check if this is the project lead
                    if (project.lead_employee_id === employee_id) {
                        results.push({
                            employee_id,
                            success: false,
                            error: 'Cannot remove project lead',
                        });
                        continue;
                    }

                    // Delete member
                    await manager.delete(ProjectRoleAssignment, {
                        project_id: projectId,
                        employee_id: employee_id,
                    });

                    results.push({
                        employee_id,
                        success: true,
                    });
                } catch (error: any) {
                    results.push({
                        employee_id,
                        success: false,
                        error: error.message,
                    });
                }
            }
        });

        const successCount = results.filter((r) => r.success).length;

        return {
            message: `Removed ${successCount} of ${employeeIds.length} members`,
            total: employeeIds.length,
            success: successCount,
            failed: employeeIds.length - successCount,
            results,
        };
    }

    /**
     * Lấy danh sách các role có sẵn trong hệ thống
     */
    async getAvailableRoles(): Promise<ProjectRole[]> {
        return await this.projectRoleRepository.find({
            order: { role_name: 'ASC' },
        });
    }

    /**
     * Lấy danh sách employees chưa là thành viên của project
     */
    async getNonMembers(projectId: number): Promise<Employee[]> {
        // Get all member IDs in this project
        const members = await this.roleAssignmentRepository.find({
            where: { project_id: projectId },
            select: ['employee_id'],
        });

        const memberIds = members.map((m) => m.employee_id);

        // Get all employees who are not members
        const queryBuilder = this.employeeRepository.createQueryBuilder('employee');

        if (memberIds.length > 0) {
            queryBuilder.where('employee.id NOT IN (:...memberIds)', { memberIds });
        }

        queryBuilder
            .andWhere('employee.status = :status', { status: 'ACTIVE' })
            .orderBy('employee.full_name', 'ASC');

        return await queryBuilder.getMany();
    }

    /**
     * Thống kê về team
     */
    async getTeamStatistics(projectId: number): Promise<any> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        // Count members by role
        const membersByRole = await this.roleAssignmentRepository
            .createQueryBuilder('pra')
            .select('pr.role_name', 'role_name')
            .addSelect('COUNT(pra.employee_id)', 'count')
            .leftJoin('pra.project_role', 'pr')
            .where('pra.project_id = :projectId', { projectId })
            .groupBy('pr.id')
            .addGroupBy('pr.role_name')
            .getRawMany();

        // Total members
        const totalMembers = await this.roleAssignmentRepository.count({
            where: { project_id: projectId },
        });

        // Recent additions (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentAdditions = await this.roleAssignmentRepository.count({
            where: {
                project_id: projectId,
            },
        });

        return {
            project_id: projectId,
            project_name: project.project_name,
            total_members: totalMembers,
            members_by_role: membersByRole.map((r) => ({
                role_name: r.role_name,
                count: parseInt(r.count),
            })),
            recent_additions: recentAdditions,
        };
    }
}