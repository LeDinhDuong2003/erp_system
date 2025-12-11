import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, TreeRepository, In } from 'typeorm';
import { Department } from '../database/entities/Department.entity';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(EmployeePosition)
    private readonly employeePositionRepository: Repository<EmployeePosition>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
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

      // No need to check circular reference when creating new department
      // because the new department doesn't have an ID yet
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

  /**
   * Get all department IDs including children recursively
   */
  private async getAllDepartmentIds(departmentId: number): Promise<number[]> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: ['children'],
    });

    if (!department) {
      return [];
    }

    const ids = [departmentId];
    
    if (department.children && department.children.length > 0) {
      for (const child of department.children) {
        const childIds = await this.getAllDepartmentIds(child.id);
        ids.push(...childIds);
      }
    }

    return ids;
  }

  /**
   * Get employees in a department and all its child departments
   */
  async getEmployees(departmentId: number) {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    // Get all department IDs including children
    const allDepartmentIds = await this.getAllDepartmentIds(departmentId);

    // Get all employees in these departments (all current positions)
    // Employees can belong to multiple departments
    const employeePositions = await this.employeePositionRepository.find({
      where: {
        department_id: In(allDepartmentIds),
        is_current: true,
      },
      relations: ['employee', 'position', 'department'],
    });

    // Remove duplicates - if an employee appears in multiple departments, show them in each department
    // But we'll group by department_id so each department shows its employees

    // Group employees by department
    // An employee can appear in multiple departments
    const employeesByDepartment: Record<number, any[]> = {};
    const employeeIdsInDept = new Set<string>(); // Track unique employee-department combinations
    
    for (const ep of employeePositions) {
      if (!ep.employee || !ep.department_id) continue;
      const deptId = ep.department_id;
      const uniqueKey = `${ep.employee.id}-${deptId}`;
      
      // Only add if not already added for this department
      if (!employeeIdsInDept.has(uniqueKey)) {
        if (!employeesByDepartment[deptId]) {
          employeesByDepartment[deptId] = [];
        }
        employeesByDepartment[deptId].push({
          id: ep.employee.id,
          employee_code: ep.employee.employee_code,
          full_name: ep.employee.full_name,
          email: ep.employee.email,
          phone: ep.employee.phone,
          position: ep.position ? {
            id: ep.position.id,
            title: ep.position.title,
            level: ep.position.level,
          } : null,
          department_id: ep.department_id,
          department_name: ep.department?.name || null,
        });
        employeeIdsInDept.add(uniqueKey);
      }
    }

    // Count unique employees (an employee can be in multiple departments)
    const uniqueEmployeeIds = new Set(employeePositions.map(ep => ep.employee_id).filter(id => id !== undefined));
    
    return {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
      },
      employees: employeesByDepartment,
      totalEmployees: uniqueEmployeeIds.size, // Count unique employees
      totalPositions: employeePositions.length, // Total position assignments
      departmentIds: allDepartmentIds,
    };
  }

  /**
   * Get statistics for a department
   */
  async getStatistics(departmentId: number) {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: ['children'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    // Get all department IDs including children
    const allDepartmentIds = await this.getAllDepartmentIds(departmentId);

    // Count unique employees (an employee can be in multiple departments)
    const employeePositions = await this.employeePositionRepository.find({
      where: {
        department_id: In(allDepartmentIds),
        is_current: true,
      },
      select: ['employee_id'],
    });
    const uniqueEmployeeIds = new Set(employeePositions.map(ep => ep.employee_id).filter(id => id !== undefined));
    const employeeCount = uniqueEmployeeIds.size;

    // Count child departments
    const childDepartmentCount = department.children?.length || 0;

    return {
      department: {
        id: department.id,
        name: department.name,
      },
      totalEmployees: employeeCount,
      childDepartments: childDepartmentCount,
      totalDepartments: allDepartmentIds.length,
    };
  }
}

