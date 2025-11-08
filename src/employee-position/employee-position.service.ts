import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Department } from '../database/entities/Department.entity';
import { Position } from '../database/entities/Position.entity';
import { CreateEmployeePositionDto } from './dto/create-employee-position.dto';
import { UpdateEmployeePositionDto } from './dto/update-employee-position.dto';

@Injectable()
export class EmployeePositionService {
  constructor(
    @InjectRepository(EmployeePosition)
    private readonly employeePositionRepository: Repository<EmployeePosition>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
  ) {}

  async create(createEmployeePositionDto: CreateEmployeePositionDto) {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: createEmployeePositionDto.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify department if provided
    if (createEmployeePositionDto.department_id) {
      const department = await this.departmentRepository.findOne({
        where: { id: createEmployeePositionDto.department_id },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Verify position if provided
    if (createEmployeePositionDto.position_id) {
      const position = await this.positionRepository.findOne({
        where: { id: createEmployeePositionDto.position_id },
      });

      if (!position) {
        throw new NotFoundException('Position not found');
      }
    }

    // If setting as current, unset other current positions
    if (createEmployeePositionDto.is_current) {
      await this.employeePositionRepository.update(
        { employee_id: createEmployeePositionDto.employee_id, is_current: true },
        { is_current: false },
      );
    }

    const data: any = {
      ...createEmployeePositionDto,
      start_date: new Date(createEmployeePositionDto.start_date),
      end_date: createEmployeePositionDto.end_date
        ? new Date(createEmployeePositionDto.end_date)
        : null,
    };

    const employeePosition = this.employeePositionRepository.create(data);
    return await this.employeePositionRepository.save(employeePosition);
  }

  async findAll(skip = 0, take = 10, employeeId?: number) {
    const where: any = {};
    if (employeeId) {
      where.employee_id = employeeId;
    }

    const [employeePositions, total] = await Promise.all([
      this.employeePositionRepository.find({
        where,
        skip,
        take,
        relations: ['employee', 'department', 'position'],
        order: { start_date: 'DESC' },
      }),
      this.employeePositionRepository.count({ where }),
    ]);

    return {
      data: employeePositions,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const employeePosition = await this.employeePositionRepository.findOne({
      where: { id },
      relations: ['employee', 'department', 'position'],
    });

    if (!employeePosition) {
      throw new NotFoundException(`Employee position with ID ${id} not found`);
    }

    return employeePosition;
  }

  async getCurrentPosition(employeeId: number) {
    const currentPosition = await this.employeePositionRepository.findOne({
      where: { employee_id: employeeId, is_current: true },
      relations: ['employee', 'department', 'position'],
    });

    if (!currentPosition) {
      return null;
    }

    return currentPosition;
  }

  async update(id: number, updateEmployeePositionDto: UpdateEmployeePositionDto) {
    const employeePosition = await this.employeePositionRepository.findOne({
      where: { id },
    });

    if (!employeePosition) {
      throw new NotFoundException(`Employee position with ID ${id} not found`);
    }

    // Verify department if provided
    if (updateEmployeePositionDto.department_id) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateEmployeePositionDto.department_id },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Verify position if provided
    if (updateEmployeePositionDto.position_id) {
      const position = await this.positionRepository.findOne({
        where: { id: updateEmployeePositionDto.position_id },
      });

      if (!position) {
        throw new NotFoundException('Position not found');
      }
    }

    // If setting as current, unset other current positions
    if (updateEmployeePositionDto.is_current) {
      await this.employeePositionRepository.update(
        { employee_id: employeePosition.employee_id, is_current: true },
        { is_current: false },
      );
    }

    const data: any = { ...updateEmployeePositionDto };
    if (updateEmployeePositionDto.start_date) {
      data.start_date = new Date(updateEmployeePositionDto.start_date);
    }
    if (updateEmployeePositionDto.end_date !== undefined) {
      data.end_date = updateEmployeePositionDto.end_date
        ? new Date(updateEmployeePositionDto.end_date)
        : null;
    }

    await this.employeePositionRepository.update({ id }, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    const employeePosition = await this.employeePositionRepository.findOne({
      where: { id },
    });

    if (!employeePosition) {
      throw new NotFoundException(`Employee position with ID ${id} not found`);
    }

    await this.employeePositionRepository.delete({ id });

    return { message: 'Employee position deleted successfully' };
  }
}

