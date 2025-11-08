import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Role } from '../database/entities/Role.entity';
import { Permission } from '../database/entities/Permission.entity';
import { RolePermission } from '../database/entities/RolePermission.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(EmployeeRoleAssignment)
    private readonly employeeRoleAssignmentRepository: Repository<EmployeeRoleAssignment>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({ where: { code: createRoleDto.code } });

    if (existing) {
      throw new ConflictException('Role code already exists');
    }

    const role = await this.roleRepository.save(this.roleRepository.create(createRoleDto));
    const full = await this.roleRepository.findOne({
      where: { id: role.id },
      relations: [
        'role_permissions',
        'role_permissions.permission',
        'employee_role_assignments',
        'employee_role_assignments.employee',
      ],
    });

    return this.transformRole(full!);
  }

  async findAll(skip = 0, take = 10, search?: string) {
    const where = search
      ? [{ code: ILike(`%${search}%`) }, { name: ILike(`%${search}%`) }]
      : {};

    const [roles, total] = await Promise.all([
      this.roleRepository.find({
        where: where as any,
        skip,
        take,
        relations: ['role_permissions', 'role_permissions.permission'],
        order: { created_at: 'DESC' },
      }),
      this.roleRepository.count({ where: where as any }),
    ]);

    return {
      data: roles.map((r) => this.transformRole(r)),
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: [
        'role_permissions',
        'role_permissions.permission',
        'employee_role_assignments',
        'employee_role_assignments.employee',
      ],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return this.transformRole(role);
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (updateRoleDto.code && updateRoleDto.code !== role.code) {
      const existing = await this.roleRepository.findOne({ where: { code: updateRoleDto.code } });

      if (existing) {
        throw new ConflictException('Role code already exists');
      }
    }

    await this.roleRepository.update({ id }, updateRoleDto);
    const updated = await this.roleRepository.findOne({
      where: { id },
      relations: ['role_permissions', 'role_permissions.permission'],
    });

    return this.transformRole(updated!);
  }

  async remove(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    await this.roleRepository.delete({ id });

    return { message: 'Role deleted successfully' };
  }

  async assignPermissions(id: number, assignPermissionsDto: AssignPermissionsDto) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const permissions = await this.permissionRepository.find({
      where: assignPermissionsDto.permission_ids.map((id) => ({ id })) as any,
    });

    if (permissions.length !== assignPermissionsDto.permission_ids.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Remove existing permission assignments
    await this.rolePermissionRepository.delete({ role_id: id } as any);

    // Create new permission assignments
    await this.rolePermissionRepository.save(
      assignPermissionsDto.permission_ids.map((permissionId) =>
        this.rolePermissionRepository.create({
          role_id: id,
          permission_id: permissionId,
        }),
      ),
    );

    return this.findOne(id);
  }

  async removePermissions(id: number, permissionIds: number[]) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    await this.rolePermissionRepository
      .createQueryBuilder()
      .delete()
      .from(RolePermission)
      .where('role_id = :roleId AND permission_id IN (:...permissionIds)', {
        roleId: id,
        permissionIds: permissionIds,
      })
      .execute();

    return this.findOne(id);
  }

  private transformRole(role: any) {
    return {
      ...role,
      permissions: role.role_permissions?.map((rp: any) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
      employee_count: role._count?.employee_role_assignments || 0,
    };
  }
}

