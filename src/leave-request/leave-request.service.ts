import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LeaveRequest, LeaveStatus, LeaveType } from '../database/entities/LeaveRequest.entity';
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

  /**
   * Check if two date ranges overlap
   */
  private datesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    // Two ranges overlap if: start1 <= end2 && start2 <= end1
    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Check if new request dates overlap with existing PENDING or APPROVED requests
   */
  private async checkDateOverlap(
    employeeId: number,
    newStartDate: Date,
    newEndDate: Date,
    excludeRequestId?: number,
  ): Promise<{ hasOverlap: boolean; conflictingRequest?: LeaveRequest }> {
    // Find all PENDING or APPROVED requests for this employee
    const existingRequests = await this.leaveRequestRepository.find({
      where: [
        {
          employee_id: employeeId,
          status: LeaveStatus.PENDING,
        },
        {
          employee_id: employeeId,
          status: LeaveStatus.APPROVED,
        },
      ],
    });

    // Check overlap with each existing request
    for (const request of existingRequests) {
      // Skip the request being updated (if any)
      if (excludeRequestId && request.id === excludeRequestId) {
        continue;
      }

      const requestStart = new Date(request.start_date);
      const requestEnd = new Date(request.end_date);

      if (this.datesOverlap(newStartDate, newEndDate, requestStart, requestEnd)) {
        return {
          hasOverlap: true,
          conflictingRequest: request,
        };
      }
    }

    return { hasOverlap: false };
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
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    // Validate: Không được chọn ngày <= ngày hiện tại
    const startDateOnly = new Date(startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(0, 0, 0, 0);

    if (startDateOnly <= now) {
      throw new BadRequestException(
        'Ngày bắt đầu phải sau ngày hiện tại. Không thể tạo yêu cầu nghỉ phép cho ngày quá khứ hoặc ngày hiện tại.',
      );
    }

    if (endDateOnly <= now) {
      throw new BadRequestException(
        'Ngày kết thúc phải sau ngày hiện tại. Không thể tạo yêu cầu nghỉ phép cho ngày quá khứ hoặc ngày hiện tại.',
      );
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after or equal to start date');
    }

    // Calculate total days if not provided
    const calculatedDays = this.calculateTotalDays(startDate, endDate);
    const totalDays = createLeaveRequestDto.total_days || calculatedDays;

    // Validate: Không được overlap với các request PENDING hoặc APPROVED
    const overlapCheck = await this.checkDateOverlap(
      employee.id,
      startDate,
      endDate,
    );

    if (overlapCheck.hasOverlap && overlapCheck.conflictingRequest) {
      const conflictStatus =
        overlapCheck.conflictingRequest.status === LeaveStatus.PENDING
          ? 'đang chờ duyệt'
          : 'đã được duyệt';
      const conflictStart = new Date(
        overlapCheck.conflictingRequest.start_date,
      ).toLocaleDateString('vi-VN');
      const conflictEnd = new Date(
        overlapCheck.conflictingRequest.end_date,
      ).toLocaleDateString('vi-VN');

      throw new BadRequestException(
        `Không thể tạo yêu cầu. Ngày nghỉ trùng với yêu cầu ${conflictStatus} từ ${conflictStart} đến ${conflictEnd}.`,
      );
    }

    // Validate annual leave limit (only for ANNUAL type)
    // Chỉ check số ngày còn lại trong DB, không tính từ requests
    if (createLeaveRequestDto.type === LeaveType.ANNUAL) {
      const currentYear = new Date().getFullYear();
      const remainingDays = employee.remaining_leave_days ?? employee.annual_leave_limit ?? 12;

      // Cho phép tạo nếu totalDays <= remainingDays (cho phép bằng)
      if (totalDays > remainingDays) {
        throw new BadRequestException(
          `Vượt quá số ngày phép còn lại. Bạn còn ${remainingDays} ngày phép trong năm ${currentYear}. Yêu cầu: ${totalDays} ngày.`,
        );
      }
      
      // Đảm bảo totalDays là số nguyên dương
      if (totalDays <= 0) {
        throw new BadRequestException('Số ngày phép phải lớn hơn 0');
      }
    }

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
      relations: ['employee'],
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

    // Update status to APPROVED
    await this.leaveRequestRepository.update(
      { id },
      {
        status: LeaveStatus.APPROVED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    );

    // Trừ số ngày phép còn lại trong DB khi duyệt (chỉ cho ANNUAL type)
    if (leaveRequest.type === LeaveType.ANNUAL) {
      const requestDays = leaveRequest.total_days || 0;
      const currentRemaining = leaveRequest.employee.remaining_leave_days ?? leaveRequest.employee.annual_leave_limit ?? 12;
      const newRemaining = Math.max(0, currentRemaining - requestDays);

      await this.employeeRepository.update(
        { id: leaveRequest.employee_id },
        { remaining_leave_days: newRemaining },
      );

      console.log('[Leave Approve] Deducted leave days:', {
        employeeId: leaveRequest.employee_id,
        requestDays,
        oldRemaining: currentRemaining,
        newRemaining,
      });
    }

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
      const newStartDate = updateLeaveRequestDto.start_date
        ? new Date(updateLeaveRequestDto.start_date)
        : new Date(leaveRequest.start_date);
      const newEndDate = updateLeaveRequestDto.end_date
        ? new Date(updateLeaveRequestDto.end_date)
        : new Date(leaveRequest.end_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

      // Validate: Không được chọn ngày <= ngày hiện tại
      const startDateOnly = new Date(newStartDate);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(newEndDate);
      endDateOnly.setHours(0, 0, 0, 0);

      if (startDateOnly <= now) {
        throw new BadRequestException(
          'Ngày bắt đầu phải sau ngày hiện tại. Không thể cập nhật yêu cầu nghỉ phép cho ngày quá khứ hoặc ngày hiện tại.',
        );
      }

      if (endDateOnly <= now) {
        throw new BadRequestException(
          'Ngày kết thúc phải sau ngày hiện tại. Không thể cập nhật yêu cầu nghỉ phép cho ngày quá khứ hoặc ngày hiện tại.',
        );
      }

      if (newEndDate < newStartDate) {
        throw new BadRequestException('End date must be after or equal to start date');
      }

      // Validate: Không được overlap với các request PENDING hoặc APPROVED khác
      const overlapCheck = await this.checkDateOverlap(
        leaveRequest.employee_id,
        newStartDate,
        newEndDate,
        id, // Exclude current request
      );

      if (overlapCheck.hasOverlap && overlapCheck.conflictingRequest) {
        const conflictStatus =
          overlapCheck.conflictingRequest.status === LeaveStatus.PENDING
            ? 'đang chờ duyệt'
            : 'đã được duyệt';
        const conflictStart = new Date(
          overlapCheck.conflictingRequest.start_date,
        ).toLocaleDateString('vi-VN');
        const conflictEnd = new Date(
          overlapCheck.conflictingRequest.end_date,
        ).toLocaleDateString('vi-VN');

        throw new BadRequestException(
          `Không thể cập nhật yêu cầu. Ngày nghỉ trùng với yêu cầu ${conflictStatus} từ ${conflictStart} đến ${conflictEnd}.`,
        );
      }

      data.start_date = newStartDate;
      data.end_date = newEndDate;
      data.total_days = this.calculateTotalDays(newStartDate, newEndDate);
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

  /**
   * Get leave balance for an employee
   * Lấy từ DB field remaining_leave_days thay vì tính từ requests
   */
  async getLeaveBalance(employeeId: number, year?: number): Promise<{
    limit: number;
    used: number;
    remaining: number;
    year: number;
  }> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const currentYear = year || new Date().getFullYear();
    const limit = employee.annual_leave_limit || 12;
    const remaining = employee.remaining_leave_days ?? limit; // Nếu chưa có thì dùng limit
    const used = limit - remaining;

    return {
      limit,
      used: Math.max(0, used),
      remaining: Math.max(0, remaining),
      year: currentYear,
    };
  }
}

