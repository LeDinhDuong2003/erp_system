import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  HrRequest,
  HrRequestType,
  HrRequestStatus,
  LeaveType,
  LateEarlyType,
} from '../database/entities/HrRequest.entity';
import { Employee } from '../database/entities/Employee.entity';
import { EmployeePosition } from '../database/entities/EmployeePosition.entity';

@Injectable()
export class HrRequestService {
  constructor(
    @InjectRepository(HrRequest)
    private readonly hrRequestRepository: Repository<HrRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeePosition)
    private readonly employeePositionRepository: Repository<EmployeePosition>,
  ) {}

  // ============ LEAVE REQUEST METHODS ============

  private calculateTotalDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  private datesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  private async checkLeaveDateOverlap(
    employeeId: number,
    newStartDate: Date,
    newEndDate: Date,
    excludeRequestId?: number,
  ): Promise<{ hasOverlap: boolean; conflictingRequest?: HrRequest }> {
    const existingRequests = await this.hrRequestRepository.find({
      where: [
        {
          employee_id: employeeId,
          request_type: HrRequestType.LEAVE,
          status: HrRequestStatus.PENDING,
        },
        {
          employee_id: employeeId,
          request_type: HrRequestType.LEAVE,
          status: HrRequestStatus.APPROVED,
        },
      ],
    });

    for (const request of existingRequests) {
      if (excludeRequestId && request.id === excludeRequestId) {
        continue;
      }

      if (request.start_date && request.end_date) {
        const requestStart = new Date(request.start_date);
        const requestEnd = new Date(request.end_date);

        if (this.datesOverlap(newStartDate, newEndDate, requestStart, requestEnd)) {
          return {
            hasOverlap: true,
            conflictingRequest: request,
          };
        }
      }
    }

    return { hasOverlap: false };
  }

  async createLeaveRequest(data: {
    employee_id: number;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<HrRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (startDate < now) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check date overlap
    const overlapCheck = await this.checkLeaveDateOverlap(
      data.employee_id,
      startDate,
      endDate,
    );

    if (overlapCheck.hasOverlap) {
      throw new BadRequestException(
        'Leave request dates overlap with an existing approved or pending request',
      );
    }

    const totalDays = this.calculateTotalDays(startDate, endDate);

    const request = this.hrRequestRepository.create({
      employee_id: data.employee_id,
      request_type: HrRequestType.LEAVE,
      status: HrRequestStatus.PENDING,
      leave_type: data.leave_type,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason: data.reason || null,
    });

    return await this.hrRequestRepository.save(request);
  }

  // ============ OVERTIME REQUEST METHODS ============

  async createOvertimeRequest(data: {
    employee_id: number;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
  }): Promise<HrRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Calculate hours
    const start = new Date(`${data.date}T${data.start_time}`);
    const end = new Date(`${data.date}T${data.end_time}`);
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const request = this.hrRequestRepository.create({
      employee_id: data.employee_id,
      request_type: HrRequestType.OVERTIME,
      status: HrRequestStatus.PENDING,
      overtime_date: new Date(data.date),
      start_time: data.start_time,
      end_time: data.end_time,
      overtime_hours: Math.round(hours * 100) / 100,
      reason: data.reason || null,
    });

    return await this.hrRequestRepository.save(request);
  }

  // ============ LATE/EARLY REQUEST METHODS ============

  async createLateEarlyRequest(data: {
    employee_id: number;
    date: string;
    type: LateEarlyType;
    actual_time?: string;
    minutes?: number;
    reason?: string;
  }): Promise<HrRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const request = this.hrRequestRepository.create({
      employee_id: data.employee_id,
      request_type: HrRequestType.LATE_EARLY,
      status: HrRequestStatus.PENDING,
      late_early_date: new Date(data.date),
      late_early_type: data.type,
      actual_time: data.actual_time || null,
      minutes: data.minutes || null,
      reason: data.reason || null,
    });

    return await this.hrRequestRepository.save(request);
  }

  // ============ COMMON METHODS ============

  async findAll(filters?: {
    employee_id?: number;
    request_type?: HrRequestType;
    status?: HrRequestStatus;
    currentUser?: {
      id: number;
      roles?: Array<{ code: string }>;
    };
  }): Promise<HrRequest[]> {
    const where: any = {};
    
    // Check if user has SUPER_ADMIN role
    const userRoles = filters?.currentUser?.roles?.map(r => r.code) || [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const isManager = userRoles.includes('MANAGER');

    if (filters?.employee_id) {
      where.employee_id = filters.employee_id;
    } else if (!isSuperAdmin && !isManager) {
      // Regular employees can only see their own requests
      where.employee_id = filters?.currentUser?.id;
    } else if (isManager && !isSuperAdmin) {
      // Manager can only see requests from employees with lower position level and same department
      if (!filters?.currentUser?.id) {
        return [];
      }

      // Use query builder to avoid loading department_id from positions table (until migration is run)
      const currentUserPosition = await this.employeePositionRepository
        .createQueryBuilder('ep')
        .leftJoinAndSelect('ep.department', 'department')
        .leftJoin('ep.position', 'position')
        .addSelect([
          'position.id',
          'position.title',
          'position.level',
          'position.description',
          // Exclude position.department_id until migration is run
        ])
        .where('ep.employee_id = :employeeId', { employeeId: filters.currentUser.id })
        .andWhere('ep.is_current = :isCurrent', { isCurrent: true })
        .getOne();

      if (!currentUserPosition || !currentUserPosition.position || !currentUserPosition.department) {
        // If manager doesn't have position/department, return empty
        return [];
      }

      const currentPositionLevel = currentUserPosition.position.level;
      const currentDepartmentId = currentUserPosition.department.id;

      if (currentPositionLevel === null || currentDepartmentId === null) {
        return [];
      }

      // Get all employees with lower position level and same department
      const eligiblePositions = await this.employeePositionRepository.find({
        where: {
          is_current: true,
          department_id: currentDepartmentId,
        },
        relations: ['position', 'employee'],
      });

      const eligibleEmployeeIds = eligiblePositions
        .filter(ep => ep.position && ep.position.level !== null && ep.position.level < currentPositionLevel)
        .map(ep => ep.employee_id);
      
      if (eligibleEmployeeIds.length === 0) {
        return [];
      }

      where.employee_id = In(eligibleEmployeeIds);
    }
    // If SUPER_ADMIN, no employee_id filter (show all)

    if (filters?.request_type) {
      where.request_type = filters.request_type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    // Build query with proper TypeORM syntax
    const queryBuilder = this.hrRequestRepository.createQueryBuilder('hr_request')
      .leftJoinAndSelect('hr_request.employee', 'employee')
      .leftJoinAndSelect('hr_request.approver', 'approver')
      .orderBy('hr_request.created_at', 'DESC');

    if (where.employee_id) {
      if (where.employee_id instanceof In) {
        // Handle In() operator
        const employeeIds = (where.employee_id as any).value;
        if (employeeIds && employeeIds.length > 0) {
          queryBuilder.andWhere('hr_request.employee_id IN (:...employeeIds)', { employeeIds });
        } else {
          return []; // No eligible employees
        }
      } else if (Array.isArray(where.employee_id)) {
        queryBuilder.andWhere('hr_request.employee_id IN (:...employeeIds)', { employeeIds: where.employee_id });
      } else {
        queryBuilder.andWhere('hr_request.employee_id = :employeeId', { employeeId: where.employee_id });
      }
    }

    if (where.request_type) {
      queryBuilder.andWhere('hr_request.request_type = :requestType', { requestType: where.request_type });
    }

    if (where.status) {
      queryBuilder.andWhere('hr_request.status = :status', { status: where.status });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: number): Promise<HrRequest> {
    const request = await this.hrRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'approver'],
    });

    if (!request) {
      throw new NotFoundException('HR Request not found');
    }

    return request;
  }

  async approve(
    id: number, 
    approverId: number, 
    note?: string,
    approverRoles?: Array<{ code: string }>,
  ): Promise<HrRequest> {
    const request = await this.findOne(id);

    if (request.status !== HrRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // Check if approver has permission (SUPER_ADMIN or MANAGER with proper access)
    const userRoles = approverRoles?.map(r => r.code) || [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const isManager = userRoles.includes('MANAGER');

    if (!isSuperAdmin && isManager) {
      // Manager can only approve requests from employees with lower position and same department
      const approverPosition = await this.employeePositionRepository.findOne({
        where: { 
          employee_id: approverId,
          is_current: true,
        },
        relations: ['position', 'department'],
      });

      const requesterPosition = await this.employeePositionRepository.findOne({
        where: { 
          employee_id: request.employee_id,
          is_current: true,
        },
        relations: ['position', 'department'],
      });

      if (!approverPosition || !approverPosition.position || !approverPosition.department) {
        throw new ForbiddenException('You do not have permission to approve this request');
      }

      if (!requesterPosition || !requesterPosition.position || !requesterPosition.department) {
        throw new ForbiddenException('Requester does not have a valid position');
      }

      const approverLevel = approverPosition.position.level;
      const requesterLevel = requesterPosition.position.level;
      const approverDeptId = approverPosition.department.id;
      const requesterDeptId = requesterPosition.department.id;

      if (requesterLevel === null || approverLevel === null || requesterLevel >= approverLevel) {
        throw new ForbiddenException('You can only approve requests from employees with lower position level');
      }

      if (approverDeptId !== requesterDeptId) {
        throw new ForbiddenException('You can only approve requests from employees in the same department');
      }
    } else if (!isSuperAdmin && !isManager) {
      throw new ForbiddenException('You do not have permission to approve requests');
    }

    request.status = HrRequestStatus.APPROVED;
    request.approved_by = approverId;
    request.approved_at = new Date();
    request.approval_note = note || null;

    return await this.hrRequestRepository.save(request);
  }

  async reject(
    id: number, 
    approverId: number, 
    note?: string,
    approverRoles?: Array<{ code: string }>,
  ): Promise<HrRequest> {
    const request = await this.findOne(id);

    if (request.status !== HrRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    // Check if approver has permission (SUPER_ADMIN or MANAGER with proper access)
    const userRoles = approverRoles?.map(r => r.code) || [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const isManager = userRoles.includes('MANAGER');

    if (!isSuperAdmin && isManager) {
      // Manager can only reject requests from employees with lower position and same department
      const approverPosition = await this.employeePositionRepository.findOne({
        where: { 
          employee_id: approverId,
          is_current: true,
        },
        relations: ['position', 'department'],
      });

      const requesterPosition = await this.employeePositionRepository.findOne({
        where: { 
          employee_id: request.employee_id,
          is_current: true,
        },
        relations: ['position', 'department'],
      });

      if (!approverPosition || !approverPosition.position || !approverPosition.department) {
        throw new ForbiddenException('You do not have permission to reject this request');
      }

      if (!requesterPosition || !requesterPosition.position || !requesterPosition.department) {
        throw new ForbiddenException('Requester does not have a valid position');
      }

      const approverLevel = approverPosition.position.level;
      const requesterLevel = requesterPosition.position.level;
      const approverDeptId = approverPosition.department.id;
      const requesterDeptId = requesterPosition.department.id;

      if (requesterLevel === null || approverLevel === null || requesterLevel >= approverLevel) {
        throw new ForbiddenException('You can only reject requests from employees with lower position level');
      }

      if (approverDeptId !== requesterDeptId) {
        throw new ForbiddenException('You can only reject requests from employees in the same department');
      }
    } else if (!isSuperAdmin && !isManager) {
      throw new ForbiddenException('You do not have permission to reject requests');
    }

    request.status = HrRequestStatus.REJECTED;
    request.approved_by = approverId;
    request.approved_at = new Date();
    request.approval_note = note || null;

    return await this.hrRequestRepository.save(request);
  }

  async cancel(id: number, employeeId: number): Promise<HrRequest> {
    const request = await this.findOne(id);

    if (request.employee_id !== employeeId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    if (request.status !== HrRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    request.status = HrRequestStatus.CANCELLED;

    return await this.hrRequestRepository.save(request);
  }

  async update(id: number, updateData: Partial<HrRequest>, employeeId: number): Promise<HrRequest> {
    const request = await this.findOne(id);

    if (request.employee_id !== employeeId) {
      throw new BadRequestException('You can only update your own requests');
    }

    if (request.status !== HrRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be updated');
    }

    // Update allowed fields
    if (updateData.reason !== undefined) {
      request.reason = updateData.reason;
    }

    // Update type-specific fields
    if (request.request_type === HrRequestType.LEAVE) {
      if (updateData.start_date) request.start_date = new Date(updateData.start_date);
      if (updateData.end_date) request.end_date = new Date(updateData.end_date);
      if (updateData.leave_type) request.leave_type = updateData.leave_type;
      if (request.start_date && request.end_date) {
        request.total_days = this.calculateTotalDays(request.start_date, request.end_date);
      }
    } else if (request.request_type === HrRequestType.OVERTIME) {
      if (updateData.overtime_date) request.overtime_date = new Date(updateData.overtime_date);
      if (updateData.start_time) request.start_time = updateData.start_time;
      if (updateData.end_time) request.end_time = updateData.end_time;
      if (request.start_time && request.end_time && request.overtime_date) {
        const start = new Date(`${request.overtime_date}T${request.start_time}`);
        const end = new Date(`${request.overtime_date}T${request.end_time}`);
        request.overtime_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    } else if (request.request_type === HrRequestType.LATE_EARLY) {
      if (updateData.late_early_date) request.late_early_date = new Date(updateData.late_early_date);
      if (updateData.late_early_type) request.late_early_type = updateData.late_early_type;
      if (updateData.actual_time !== undefined) request.actual_time = updateData.actual_time;
      if (updateData.minutes !== undefined) request.minutes = updateData.minutes;
    }

    return await this.hrRequestRepository.save(request);
  }

  async delete(id: number, employeeId: number): Promise<void> {
    const request = await this.findOne(id);

    if (request.employee_id !== employeeId) {
      throw new BadRequestException('You can only delete your own requests');
    }

    if (request.status !== HrRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be deleted');
    }

    await this.hrRequestRepository.remove(request);
  }

  // ============ LEAVE BALANCE ============

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

    const targetYear = year || new Date().getFullYear();
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear, 11, 31);

    const approvedLeaves = await this.hrRequestRepository.find({
      where: {
        employee_id: employeeId,
        request_type: HrRequestType.LEAVE,
        status: HrRequestStatus.APPROVED,
        start_date: Between(yearStart, yearEnd),
      },
    });

    const used = approvedLeaves.reduce((sum, leave) => {
      return sum + (leave.total_days || 0);
    }, 0);

    const limit = employee.annual_leave_limit || 12;

    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      year: targetYear,
    };
  }
}

