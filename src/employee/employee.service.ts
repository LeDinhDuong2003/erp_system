import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(EmployeeRoleAssignment)
    private readonly employeeRoleAssignmentRepository: Repository<EmployeeRoleAssignment>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    // Check if username or email already exists
    const existing = await this.employeeRepository.findOne({
      where: [
        { username: createEmployeeDto.username },
        { email: createEmployeeDto.email },
        { employee_code: createEmployeeDto.employee_code },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'Username, email, or employee code already exists',
      );
    }

    const data: Partial<Employee> & { password?: string } = {
      ...createEmployeeDto,
      dob: createEmployeeDto.dob ? new Date(createEmployeeDto.dob) : null,
    };

    // Hash password if provided
    if (createEmployeeDto.password) {
      data.password_hash = await bcrypt.hash(createEmployeeDto.password, 10);
    }

    delete (data as any).password;

    const employeeEntity: Employee = this.employeeRepository.create(
      data as Partial<Employee>,
    );
    const employee: Employee = await this.employeeRepository.save(employeeEntity);
    const full = await this.employeeRepository.findOne({
      where: { id: employee.id },
      relations: ['employee_role_assignments', 'employee_role_assignments.role'],
    });

    return this.transformEmployee(full!);
  }

  async findAll(skip = 0, take = 10, search?: string) {
    const where = search
      ? [
          { username: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
          { full_name: ILike(`%${search}%`) },
          { employee_code: ILike(`%${search}%`) },
        ]
      : {};

    const [employees, total] = await Promise.all([
      this.employeeRepository.find({
        where: where as any,
        skip,
        take,
        relations: ['employee_role_assignments', 'employee_role_assignments.role'],
        order: { created_at: 'DESC' },
      }),
      this.employeeRepository.count({ where: where as any }),
    ]);

    return {
      data: employees.map((e) => this.transformEmployee(e)),
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: [
        'employee_role_assignments',
        'employee_role_assignments.role',
        'employee_role_assignments.role.role_permissions',
        'employee_role_assignments.role.role_permissions.permission',
      ],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.transformEmployee(employee);
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Check for conflicts if updating username, email, or employee_code
    if (
      updateEmployeeDto.username ||
      updateEmployeeDto.email ||
      updateEmployeeDto.employee_code
    ) {
      const existing = await this.employeeRepository.findOne({
        where: [
          updateEmployeeDto.username ? { username: updateEmployeeDto.username } : undefined,
          updateEmployeeDto.email ? { email: updateEmployeeDto.email } : undefined,
          updateEmployeeDto.employee_code
            ? { employee_code: updateEmployeeDto.employee_code }
            : undefined,
        ].filter(Boolean) as any,
      });

      if (existing) {
        throw new ConflictException(
          'Username, email, or employee code already exists',
        );
      }
    }

    const data: any = { ...updateEmployeeDto };

    if (updateEmployeeDto.dob) {
      data.dob = new Date(updateEmployeeDto.dob);
    }

    // Hash password if provided
    if (updateEmployeeDto.password) {
      data.password_hash = await bcrypt.hash(updateEmployeeDto.password, 10);
      delete data.password;
    }

    await this.employeeRepository.update({ id }, data);
    const updated = await this.employeeRepository.findOne({
      where: { id },
      relations: ['employee_role_assignments', 'employee_role_assignments.role'],
    });

    return this.transformEmployee(updated!);
  }

  async remove(id: number) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.employeeRepository.delete({ id });

    return { message: 'Employee deleted successfully' };
  }

  async assignRoles(id: number, assignRolesDto: AssignRolesDto) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Verify all roles exist
    const roles = await this.roleRepository.find({ where: assignRolesDto.role_ids.map((id) => ({ id })) as any });

    if (roles.length !== assignRolesDto.role_ids.length) {
      throw new BadRequestException('One or more roles not found');
    }

    // Remove existing role assignments
    await this.employeeRoleAssignmentRepository.delete({ employee_id: id } as any);

    // Create new role assignments
    await this.employeeRoleAssignmentRepository.save(
      assignRolesDto.role_ids.map((roleId) =>
        this.employeeRoleAssignmentRepository.create({
          employee_id: id,
          role_id: roleId,
        }),
      ),
    );

    return this.findOne(id);
  }

  async removeRoles(id: number, roleIds: number[]) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.employeeRoleAssignmentRepository
      .createQueryBuilder()
      .delete()
      .from(EmployeeRoleAssignment)
      .where('employee_id = :employeeId AND role_id IN (:...roleIds)', {
        employeeId: id,
        roleIds: roleIds,
      })
      .execute();

    return this.findOne(id);
  }

  private transformEmployee(employee: any) {
    return {
      ...employee,
      roles: employee.employee_role_assignments?.map((er: any) => ({
        id: er.role.id,
        code: er.role.code,
        name: er.role.name,
        description: er.role.description,
      })),
    };
  }
}

