import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmployeeSalary, SalaryStatus } from '../database/entities/EmployeeSalary.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateEmployeeSalaryDto } from './dto/create-employee-salary.dto';
import { UpdateEmployeeSalaryDto } from './dto/update-employee-salary.dto';

@Injectable()
export class EmployeeSalaryService {
  constructor(
    @InjectRepository(EmployeeSalary)
    private readonly employeeSalaryRepository: Repository<EmployeeSalary>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private calculateTotalSalary(
    baseSalary: number,
    workHours: number,
    bonus: number = 0,
    allowance: number = 0,
    deduction: number = 0,
  ): number {
    // Simple calculation: base salary + bonus + allowance - deduction
    // You can customize this based on your business logic
    return (baseSalary || 0) + (bonus || 0) + (allowance || 0) - (deduction || 0);
  }

  async create(createEmployeeSalaryDto: CreateEmployeeSalaryDto) {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: createEmployeeSalaryDto.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if salary already exists for this month
    const monthDate = new Date(createEmployeeSalaryDto.month);
    monthDate.setDate(1); // Set to first day of month

    const existing = await this.employeeSalaryRepository.findOne({
      where: {
        employee_id: createEmployeeSalaryDto.employee_id,
        month: monthDate,
      },
    });

    if (existing) {
      throw new ConflictException('Salary record already exists for this month');
    }

    const data: any = {
      ...createEmployeeSalaryDto,
      month: monthDate,
      pay_date: createEmployeeSalaryDto.pay_date
        ? new Date(createEmployeeSalaryDto.pay_date)
        : null,
      bonus: createEmployeeSalaryDto.bonus || 0,
      allowance: createEmployeeSalaryDto.allowance || 0,
      deduction: createEmployeeSalaryDto.deduction || 0,
      status: createEmployeeSalaryDto.status || SalaryStatus.PENDING,
    };

    // Calculate total salary if not provided
    if (!data.total_salary && data.base_salary) {
      data.total_salary = this.calculateTotalSalary(
        data.base_salary,
        data.work_hours || 0,
        data.bonus,
        data.allowance,
        data.deduction,
      );
    }

    const employeeSalary = this.employeeSalaryRepository.create(data);
    return await this.employeeSalaryRepository.save(employeeSalary);
  }

  async findAll(
    skip = 0,
    take = 10,
    employeeId?: number,
    startMonth?: string,
    endMonth?: string,
    status?: SalaryStatus,
  ) {
    const where: any = {};

    if (employeeId) {
      where.employee_id = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (startMonth && endMonth) {
      const start = new Date(startMonth);
      start.setDate(1);
      const end = new Date(endMonth);
      end.setDate(1);
      where.month = Between(start, end);
    } else if (startMonth) {
      const start = new Date(startMonth);
      start.setDate(1);
      where.month = Between(start, new Date());
    }

    const [salaries, total] = await Promise.all([
      this.employeeSalaryRepository.find({
        where,
        skip,
        take,
        relations: ['employee'],
        order: { month: 'DESC' },
      }),
      this.employeeSalaryRepository.count({ where }),
    ]);

    return {
      data: salaries,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
      relations: ['employee'],
    });

    if (!salary) {
      throw new NotFoundException(`Employee salary with ID ${id} not found`);
    }

    return salary;
  }

  async update(id: number, updateEmployeeSalaryDto: UpdateEmployeeSalaryDto) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
    });

    if (!salary) {
      throw new NotFoundException(`Employee salary with ID ${id} not found`);
    }

    const data: any = { ...updateEmployeeSalaryDto };

    if (updateEmployeeSalaryDto.month) {
      const monthDate = new Date(updateEmployeeSalaryDto.month);
      monthDate.setDate(1);
      data.month = monthDate;
    }

    if (updateEmployeeSalaryDto.pay_date) {
      data.pay_date = new Date(updateEmployeeSalaryDto.pay_date);
    }

    // Recalculate total salary if relevant fields changed
    if (
      updateEmployeeSalaryDto.base_salary !== undefined ||
      updateEmployeeSalaryDto.bonus !== undefined ||
      updateEmployeeSalaryDto.allowance !== undefined ||
      updateEmployeeSalaryDto.deduction !== undefined
    ) {
      const baseSalary = updateEmployeeSalaryDto.base_salary ?? salary.base_salary;
      const workHours = updateEmployeeSalaryDto.work_hours ?? salary.work_hours;
      const bonus = updateEmployeeSalaryDto.bonus ?? salary.bonus;
      const allowance = updateEmployeeSalaryDto.allowance ?? salary.allowance;
      const deduction = updateEmployeeSalaryDto.deduction ?? salary.deduction;

      if (baseSalary) {
        data.total_salary = this.calculateTotalSalary(
          parseFloat(baseSalary.toString()),
          workHours ? parseFloat(workHours.toString()) : 0,
          bonus ? parseFloat(bonus.toString()) : 0,
          allowance ? parseFloat(allowance.toString()) : 0,
          deduction ? parseFloat(deduction.toString()) : 0,
        );
      }
    }

    await this.employeeSalaryRepository.update({ id }, data);
    return this.findOne(id);
  }

  async approve(id: number) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
    });

    if (!salary) {
      throw new NotFoundException(`Employee salary with ID ${id} not found`);
    }

    if (salary.status === SalaryStatus.PAID) {
      throw new BadRequestException('Salary is already paid');
    }

    await this.employeeSalaryRepository.update(
      { id },
      { status: SalaryStatus.APPROVED },
    );

    return this.findOne(id);
  }

  async markAsPaid(id: number, payDate?: string, paymentMethod?: string) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
    });

    if (!salary) {
      throw new NotFoundException(`Employee salary with ID ${id} not found`);
    }

    const updateData: any = {
      status: SalaryStatus.PAID,
      pay_date: payDate ? new Date(payDate) : new Date(),
    };

    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    await this.employeeSalaryRepository.update({ id }, updateData);

    return this.findOne(id);
  }

  async remove(id: number) {
    const salary = await this.employeeSalaryRepository.findOne({
      where: { id },
    });

    if (!salary) {
      throw new NotFoundException(`Employee salary with ID ${id} not found`);
    }

    await this.employeeSalaryRepository.delete({ id });

    return { message: 'Employee salary deleted successfully' };
  }
}

