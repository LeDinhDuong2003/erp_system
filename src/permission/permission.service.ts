import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Permission } from '../database/entities/Permission.entity';
import { RolePermission } from '../database/entities/RolePermission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const existing = await this.permissionRepository.findOne({
      where: { code: createPermissionDto.code },
    });

    if (existing) {
      throw new ConflictException('Permission code already exists');
    }

    const permission = await this.permissionRepository.save(
      this.permissionRepository.create(createPermissionDto),
    );
    const full = await this.permissionRepository.findOne({
      where: { id: permission.id },
      relations: ['role_permissions', 'role_permissions.role'],
    });

    return this.transformPermission(full!);
  }

  async findAll(skip = 0, take = 10, search?: string) {
    const where = search
      ? [{ code: ILike(`%${search}%`) }, { name: ILike(`%${search}%`) }]
      : {};

    const [permissions, total] = await Promise.all([
      this.permissionRepository.find({
        where: where as any,
        skip,
        take,
        order: { code: 'ASC' },
        relations: ['role_permissions'],
      }),
      this.permissionRepository.count({ where: where as any }),
    ]);

    return {
      data: permissions.map((p) => this.transformPermission(p)),
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id: id.toString() },
      relations: ['role_permissions', 'role_permissions.role'],
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return this.transformPermission(permission);
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.permissionRepository.findOne({ where: { id: id.toString() } });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    if (updatePermissionDto.code && updatePermissionDto.code !== permission.code) {
      const existing = await this.permissionRepository.findOne({
        where: { code: updatePermissionDto.code },
      });

      if (existing) {
        throw new ConflictException('Permission code already exists');
      }
    }

    await this.permissionRepository.update({ id: id.toString() }, updatePermissionDto);
    const updated = await this.permissionRepository.findOne({
      where: { id: id.toString() },
      relations: ['role_permissions', 'role_permissions.role'],
    });

    return this.transformPermission(updated!);
  }

  async remove(id: string) {
    const permission = await this.permissionRepository.findOne({ where: { id: id.toString() } });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    await this.permissionRepository.delete({ id: id.toString() });

    return { message: 'Permission deleted successfully' };
  }

  private transformPermission(permission: any) {
    return {
      ...permission,
      id: permission.id.toString(),
      roles: permission.role_permissions?.map((rp: any) => ({
        id: rp.role.id.toString(),
        code: rp.role.code,
        name: rp.role.name,
      })),
      role_count:
        Array.isArray(permission.role_permissions) ? permission.role_permissions.length : 0,
    };
  }
}

