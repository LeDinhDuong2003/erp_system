import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OvertimeRequest, OvertimeStatus } from '../database/entities/OvertimeRequest.entity';
import { Employee } from '../database/entities/Employee.entity';

@Injectable()
export class OvertimeRequestService {
  constructor(
    @InjectRepository(OvertimeRequest)
    private readonly overtimeRepository: Repository<OvertimeRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(employeeId: number, createData: {
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }): Promise<OvertimeRequest> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Calculate hours
    const start = new Date(`${createData.date}T${createData.start_time}`);
    const end = new Date(`${createData.date}T${createData.end_time}`);
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const overtime = this.overtimeRepository.create({
      employee_id: employeeId,
      date: new Date(createData.date),
      start_time: createData.start_time,
      end_time: createData.end_time,
      hours: Math.round(hours * 100) / 100,
      reason: createData.reason,
      status: OvertimeStatus.PENDING,
    });

    return await this.overtimeRepository.save(overtime);
  }

  async findAll(employeeId?: number, status?: OvertimeStatus): Promise<OvertimeRequest[]> {
    const where: any = {};
    if (employeeId) {
      where.employee_id = employeeId;
    }
    if (status) {
      where.status = status;
    }

    return await this.overtimeRepository.find({
      where,
      relations: ['employee', 'approver'],
      order: { date: 'DESC', created_at: 'DESC' },
    });
  }

  async findById(id: number): Promise<OvertimeRequest> {
    const overtime = await this.overtimeRepository.findOne({
      where: { id },
      relations: ['employee', 'approver'],
    });

    if (!overtime) {
      throw new NotFoundException('Overtime request not found');
    }

    return overtime;
  }

  async approve(id: number, approverId: number, note?: string): Promise<OvertimeRequest> {
    const overtime = await this.findById(id);

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Overtime request is not pending');
    }

    overtime.status = OvertimeStatus.APPROVED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();
    overtime.approval_note = note || null;

    return await this.overtimeRepository.save(overtime);
  }

  async reject(id: number, approverId: number, note?: string): Promise<OvertimeRequest> {
    const overtime = await this.findById(id);

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Overtime request is not pending');
    }

    overtime.status = OvertimeStatus.REJECTED;
    overtime.approved_by = approverId;
    overtime.approved_at = new Date();
    overtime.approval_note = note || null;

    return await this.overtimeRepository.save(overtime);
  }

  /**
   * Get approved overtime hours for an employee in a date range
   */
  async getApprovedHours(employeeId: number, startDate: Date, endDate: Date): Promise<number> {
    const overtimes = await this.overtimeRepository.find({
      where: {
        employee_id: employeeId,
        status: OvertimeStatus.APPROVED,
        date: Between(startDate, endDate),
      },
    });

    return overtimes.reduce((total, ot) => total + (Number(ot.hours) || 0), 0);
  }
}

