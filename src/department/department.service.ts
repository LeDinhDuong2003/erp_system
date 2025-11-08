import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, TreeRepository } from 'typeorm';
import { Department } from '../database/entities/Department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.departmentRepository.findOne({
      where: { name: createDepartmentDto.name },
    });

    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }

    const data: any = { ...createDepartmentDto };
    
    if (createDepartmentDto.parent_id) {
      const parent = await this.departmentRepository.findOne({
        where: { id: createDepartmentDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }

      // Prevent circular reference
      if (createDepartmentDto.parent_id === createDepartmentDto.parent_id) {
        throw new BadRequestException('Cannot set department as its own parent');
      }

      data.parent_id = createDepartmentDto.parent_id;
    }

    const department = this.departmentRepository.create(data);
    return await this.departmentRepository.save(department);
  }

  async findAll(skip = 0, take = 10, search?: string, includeChildren = false) {
    const where = search
      ? [{ name: ILike(`%${search}%`) }, { description: ILike(`%${search}%`) }]
      : {};

    const [departments, total] = await Promise.all([
      this.departmentRepository.find({
        where: where as any,
        skip,
        take,
        relations: includeChildren ? ['children', 'parent'] : ['parent'],
        order: { created_at: 'DESC' },
      }),
      this.departmentRepository.count({ where: where as any }),
    ]);

    return {
      data: departments,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number, includeChildren = false) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: includeChildren ? ['children', 'parent'] : ['parent'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async getTree() {
    const departments = await this.departmentRepository.find({
      relations: ['children', 'parent'],
      order: { name: 'ASC' },
    });

    const buildTree = (depts: Department[], parentId: number | null = null) => {
      return depts
        .filter((dept) => (dept.parent_id || null) === parentId)
        .map((dept) => ({
          ...dept,
          children: buildTree(depts, dept.id),
        }));
    };

    return buildTree(departments);
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (updateDepartmentDto.name && updateDepartmentDto.name !== department.name) {
      const existing = await this.departmentRepository.findOne({
        where: { name: updateDepartmentDto.name },
      });

      if (existing) {
        throw new ConflictException('Department with this name already exists');
      }
    }

    if (updateDepartmentDto.parent_id) {
      if (updateDepartmentDto.parent_id === id) {
        throw new BadRequestException('Cannot set department as its own parent');
      }

      const parent = await this.departmentRepository.findOne({
        where: { id: updateDepartmentDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }

      // Check for circular reference
      const checkCircular = async (deptId: number, targetId: number): Promise<boolean> => {
        const dept = await this.departmentRepository.findOne({
          where: { id: deptId },
        });
        if (!dept || !dept.parent_id) return false;
        if (dept.parent_id === targetId) return true;
        return checkCircular(dept.parent_id, targetId);
      };

      if (await checkCircular(updateDepartmentDto.parent_id, id)) {
        throw new BadRequestException('Circular reference detected');
      }
    }

    await this.departmentRepository.update({ id }, updateDepartmentDto);
    const updated = await this.departmentRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    return updated!;
  }

  async remove(id: number) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (department.children && department.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete department with child departments. Please reassign or delete children first.',
      );
    }

    await this.departmentRepository.delete({ id });

    return { message: 'Department deleted successfully' };
  }
}

