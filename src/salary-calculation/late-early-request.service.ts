import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LateEarlyRequest, LateEarlyType, LateEarlyStatus } from '../database/entities/LateEarlyRequest.entity';
import { Employee } from '../database/entities/Employee.entity';

@Injectable()
export class LateEarlyRequestService {
  constructor(
    @InjectRepository(LateEarlyRequest)
    private readonly lateEarlyRepository: Repository<LateEarlyRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(employeeId: number, createData: {
    date: string;
    type: LateEarlyType;
    actual_time?: string;
    minutes?: number;
    reason?: string;
  }): Promise<LateEarlyRequest> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const request = this.lateEarlyRepository.create({
      employee_id: employeeId,
      date: new Date(createData.date),
      type: createData.type,
      actual_time: createData.actual_time || null,
      minutes: createData.minutes || null,
      reason: createData.reason,
      status: LateEarlyStatus.PENDING,
    });

    return await this.lateEarlyRepository.save(request);
  }

  async findAll(employeeId?: number, status?: LateEarlyStatus, type?: LateEarlyType): Promise<LateEarlyRequest[]> {
    const where: any = {};
    if (employeeId) {
      where.employee_id = employeeId;
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    return await this.lateEarlyRepository.find({
      where,
      relations: ['employee', 'approver'],
      order: { date: 'DESC', created_at: 'DESC' },
    });
  }

  async findById(id: number): Promise<LateEarlyRequest> {
    const request = await this.lateEarlyRepository.findOne({
      where: { id },
      relations: ['employee', 'approver'],
    });

    if (!request) {
      throw new NotFoundException('Late/Early request not found');
    }

    return request;
  }

  async approve(id: number, approverId: number, note?: string): Promise<LateEarlyRequest> {
    const request = await this.findById(id);

    if (request.status !== LateEarlyStatus.PENDING) {
      throw new BadRequestException('Late/Early request is not pending');
    }

    request.status = LateEarlyStatus.APPROVED;
    request.approved_by = approverId;
    request.approved_at = new Date();
    request.approval_note = note || null;

    return await this.lateEarlyRepository.save(request);
  }

  async reject(id: number, approverId: number, note?: string): Promise<LateEarlyRequest> {
    const request = await this.findById(id);

    if (request.status !== LateEarlyStatus.PENDING) {
      throw new BadRequestException('Late/Early request is not pending');
    }

    request.status = LateEarlyStatus.REJECTED;
    request.approved_by = approverId;
    request.approved_at = new Date();
    request.approval_note = note || null;

    return await this.lateEarlyRepository.save(request);
  }

  /**
   * Get approved late/early requests for an employee in a date range
   */
  async getApprovedRequests(employeeId: number, startDate: Date, endDate: Date): Promise<LateEarlyRequest[]> {
    return await this.lateEarlyRepository.find({
      where: {
        employee_id: employeeId,
        status: LateEarlyStatus.APPROVED,
        date: Between(startDate, endDate),
      },
    });
  }
}

