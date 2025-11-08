import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest, LeaveStatus } from '../database/entities/LeaveRequest.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private calculateTotalDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    return diffDays;
  }

  async create(createLeaveRequestDto: CreateLeaveRequestDto, approverId?: string) {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: createLeaveRequestDto.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(createLeaveRequestDto.start_date);
    const endDate = new Date(createLeaveRequestDto.end_date);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after or equal to start date');
    }

    // Calculate total days if not provided
    const totalDays =
      createLeaveRequestDto.total_days || this.calculateTotalDays(startDate, endDate);

    const data: any = {
      ...createLeaveRequestDto,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      status: LeaveStatus.PENDING,
    };

    const leaveRequest = this.leaveRequestRepository.create(data);
    return await this.leaveRequestRepository.save(leaveRequest);
  }

  async findAll(
    skip = 0,
    take = 10,
    employeeId?: number,
    status?: LeaveStatus,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    if (employeeId) {
      where.employee_id = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.start_date = Between(new Date(startDate), new Date(endDate));
    }

    const [leaveRequests, total] = await Promise.all([
      this.leaveRequestRepository.find({
        where,
        skip,
        take,
        relations: ['employee', 'approver'],
        order: { created_at: 'DESC' },
      }),
      this.leaveRequestRepository.count({ where }),
    ]);

    return {
      data: leaveRequests,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'approver'],
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leaveRequest;
  }

  async approve(id: number, approverId: number) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    // Verify approver exists
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    await this.leaveRequestRepository.update(
      { id },
      {
        status: LeaveStatus.APPROVED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    );

    return this.findOne(id);
  }

  async reject(id: number, approverId: number) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    // Verify approver exists
    const approver = await this.employeeRepository.findOne({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    await this.leaveRequestRepository.update(
      { id },
      {
        status: LeaveStatus.REJECTED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    );

    return this.findOne(id);
  }

  async cancel(id: number, employeeId: number) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.employee_id !== employeeId) {
      throw new BadRequestException('You can only cancel your own leave requests');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be cancelled');
    }

    await this.leaveRequestRepository.update(
      { id },
      { status: LeaveStatus.CANCELLED },
    );

    return this.findOne(id);
  }

  async update(id: number, updateLeaveRequestDto: UpdateLeaveRequestDto) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    const data: any = { ...updateLeaveRequestDto };

    if (updateLeaveRequestDto.start_date || updateLeaveRequestDto.end_date) {
      const startDate = updateLeaveRequestDto.start_date
        ? new Date(updateLeaveRequestDto.start_date)
        : leaveRequest.start_date;
      const endDate = updateLeaveRequestDto.end_date
        ? new Date(updateLeaveRequestDto.end_date)
        : leaveRequest.end_date;

      if (endDate < startDate) {
        throw new BadRequestException('End date must be after or equal to start date');
      }

      data.start_date = startDate;
      data.end_date = endDate;
      data.total_days = this.calculateTotalDays(startDate, endDate);
    }

    await this.leaveRequestRepository.update({ id }, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    await this.leaveRequestRepository.delete({ id });

    return { message: 'Leave request deleted successfully' };
  }
}

