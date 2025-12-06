import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmployeeSalary, SalaryStatus } from '../database/entities/EmployeeSalary.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Attendance } from '../database/entities/Attendance.entity';
import { LeaveRequest, LeaveStatus } from '../database/entities/LeaveRequest.entity';
import { OvertimeRequest, OvertimeStatus } from '../database/entities/OvertimeRequest.entity';
import { LateEarlyRequest, LateEarlyStatus } from '../database/entities/LateEarlyRequest.entity';
import { WorkScheduleSettings } from '../database/entities/WorkScheduleSettings.entity';
import { SalarySettings } from '../database/entities/SalarySettings.entity';
import { WorkScheduleService } from './work-schedule.service';
import { SalarySettingsService } from './salary-settings.service';
import { EmployeeStatus } from '../database/entities/Employee.entity';

@Injectable()
export class SalaryCalculationService {
  constructor(
    @InjectRepository(EmployeeSalary)
    private readonly salaryRepository: Repository<EmployeeSalary>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(OvertimeRequest)
    private readonly overtimeRepository: Repository<OvertimeRequest>,
    @InjectRepository(LateEarlyRequest)
    private readonly lateEarlyRepository: Repository<LateEarlyRequest>,
    private readonly workScheduleService: WorkScheduleService,
    private readonly salarySettingsService: SalarySettingsService,
  ) {}

  /**
   * Calculate salary for an employee for a specific month
   */
  async calculateSalary(
    employeeId: number,
    year: number,
    month: number,
  ): Promise<EmployeeSalary> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['employee_role_assignments', 'employee_role_assignments.role'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if salary already calculated
    const salaryDate = new Date(year, month - 1, 1);
    const existing = await this.salaryRepository.findOne({
      where: {
        employee_id: employeeId,
        month: salaryDate,
      },
    });

    if (existing && existing.status === SalaryStatus.APPROVED) {
      throw new BadRequestException('Salary for this month has already been approved');
    }

    // Get work schedule settings
    const workSchedule = await this.workScheduleService.getSettings();

    // Get salary settings (employee-specific or role-based)
    const salarySettings = await this.salarySettingsService.getForEmployee(employeeId);
    if (!salarySettings) {
      throw new NotFoundException(
        'Salary settings not found for this employee. Please configure salary settings for this employee or their role in Settings → Salary Settings.',
      );
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    // Get attendance records
    const attendances = await this.attendanceRepository.find({
      where: {
        employee_id: employeeId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    // Get approved leave requests
    const approvedLeaves = await this.leaveRequestRepository.find({
      where: {
        employee_id: employeeId,
        status: LeaveStatus.APPROVED,
        start_date: Between(startDate, endDate),
      },
    });

    // Get approved overtime requests
    const approvedOvertimes = await this.overtimeRepository.find({
      where: {
        employee_id: employeeId,
        status: OvertimeStatus.APPROVED,
        date: Between(startDate, endDate),
      },
    });

    // Get approved late/early requests
    const approvedLateEarly = await this.lateEarlyRepository.find({
      where: {
        employee_id: employeeId,
        status: LateEarlyStatus.APPROVED,
        date: Between(startDate, endDate),
      },
    });

    // Calculate work days
    const workDays = this.calculateWorkDays(
      startDate,
      endDate,
      workSchedule,
      approvedLeaves,
    );

    // Calculate total work hours
    const totalWorkHours = this.calculateTotalWorkHours(attendances, workSchedule);

    // Calculate overtime hours (only approved)
    const overtimeHours = approvedOvertimes.reduce(
      (total, ot) => total + (Number(ot.hours) || 0),
      0,
    );

    // Calculate base salary
    const baseSalary = Number(salarySettings.base_salary);

    // Calculate salary per day
    const salaryPerDay = baseSalary / 22; // Assuming 22 working days per month

    // Calculate salary based on work days
    const workDaysSalary = workDays * salaryPerDay;

    // Calculate overtime salary
    const hourlyRate = Number(salarySettings.hourly_rate) || baseSalary / (8 * 22);
    const overtimeRate = Number(salarySettings.overtime_rate) || 1.5;
    const overtimeSalary = overtimeHours * hourlyRate * overtimeRate;

    // Calculate allowance
    const allowance = Number(salarySettings.allowance) || 0;

    // Calculate insurance (deduction)
    const insuranceRate = Number(salarySettings.insurance_rate) || 10.5;
    const insurance = (baseSalary * insuranceRate) / 100;

    // Calculate deductions (late/early penalties if not approved)
    const deduction = this.calculateDeductions(
      attendances,
      approvedLateEarly,
      workSchedule,
      hourlyRate,
    );

    // Calculate total salary
    const totalSalary = workDaysSalary + overtimeSalary + allowance - insurance - deduction;

    // Create or update salary record
    const salaryData: Partial<EmployeeSalary> = {
      employee_id: employeeId,
      month: salaryDate,
      base_salary: baseSalary,
      work_hours: totalWorkHours,
      work_days: workDays,
      approved_leave_days: approvedLeaves.reduce(
        (total, leave) => total + (Number(leave.total_days) || 0),
        0,
      ),
      overtime_hours: overtimeHours,
      overtime_salary: overtimeSalary,
      allowance: allowance,
      insurance: insurance,
      deduction: deduction,
      bonus: 0, // Can be set manually
      total_salary: Math.round(totalSalary * 100) / 100,
      status: existing?.status || SalaryStatus.PENDING,
    };

    if (existing) {
      Object.assign(existing, salaryData);
      return await this.salaryRepository.save(existing);
    } else {
      const salary = this.salaryRepository.create(salaryData);
      return await this.salaryRepository.save(salary);
    }
  }

  /**
   * Calculate work days in a month (excluding weekends and approved leaves)
   */
  private calculateWorkDays(
    startDate: Date,
    endDate: Date,
    workSchedule: WorkScheduleSettings,
    approvedLeaves: LeaveRequest[],
  ): number {
    let workDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Check if it's a working day
      if (this.workScheduleService.isWorkingDay(currentDate, workSchedule)) {
        // Check if it's in an approved leave
        const isOnLeave = approvedLeaves.some((leave) => {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        if (!isOnLeave) {
          workDays++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
  }

  /**
   * Calculate total work hours from attendance records
   */
  private calculateTotalWorkHours(
    attendances: Attendance[],
    workSchedule: WorkScheduleSettings,
  ): number {
    return attendances.reduce((total, att) => {
      if (att.work_hours) {
        return total + Number(att.work_hours);
      }
      return total;
    }, 0);
  }

  /**
   * Calculate deductions for late/early (only if not approved)
   */
  private calculateDeductions(
    attendances: Attendance[],
    approvedLateEarly: LateEarlyRequest[],
    workSchedule: WorkScheduleSettings,
    hourlyRate: number,
  ): number {
    let deduction = 0;

    for (const att of attendances) {
      // Check if there's an approved late/early request for this date
      const hasApprovedRequest = approvedLateEarly.some(
        (req) => new Date(req.date).toDateString() === new Date(att.date).toDateString(),
      );

      if (!hasApprovedRequest) {
        // Calculate late minutes penalty
        if (att.late_minutes && att.late_minutes > workSchedule.late_tolerance_minutes) {
          const lateHours = (att.late_minutes - workSchedule.late_tolerance_minutes) / 60;
          deduction += lateHours * hourlyRate * 0.5; // 50% penalty for late
        }

        // Calculate early leave minutes penalty
        if (
          att.early_leave_minutes &&
          att.early_leave_minutes > workSchedule.early_leave_tolerance_minutes
        ) {
          const earlyHours =
            (att.early_leave_minutes - workSchedule.early_leave_tolerance_minutes) / 60;
          deduction += earlyHours * hourlyRate * 0.5; // 50% penalty for early leave
        }
      }
    }

    return Math.round(deduction * 100) / 100;
  }

  /**
   * Get salary for an employee for a specific month
   */
  async getSalary(employeeId: number, year: number, month: number): Promise<EmployeeSalary | null> {
    const salaryDate = new Date(year, month - 1, 1);
    return await this.salaryRepository.findOne({
      where: {
        employee_id: employeeId,
        month: salaryDate,
      },
      relations: ['employee'],
    });
  }

  /**
   * Get all salaries for an employee
   */
  async getEmployeeSalaries(employeeId: number): Promise<EmployeeSalary[]> {
    return await this.salaryRepository.find({
      where: { employee_id: employeeId },
      relations: ['employee'],
      order: { month: 'DESC' },
    });
  }

  /**
   * Approve salary
   */
  async approveSalary(id: number): Promise<EmployeeSalary> {
    const salary = await this.salaryRepository.findOne({ where: { id } });
    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    salary.status = SalaryStatus.APPROVED;
    return await this.salaryRepository.save(salary);
  }

  /**
   * Mark salary as paid
   */
  async markAsPaid(id: number, payDate: Date, paymentMethod: string): Promise<EmployeeSalary> {
    const salary = await this.salaryRepository.findOne({ where: { id } });
    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    if (salary.status !== SalaryStatus.APPROVED) {
      throw new BadRequestException('Salary must be approved before marking as paid');
    }

    salary.status = SalaryStatus.PAID;
    salary.pay_date = payDate;
    salary.payment_method = paymentMethod as any;
    return await this.salaryRepository.save(salary);
  }

  /**
   * Calculate salary for all employees for a specific month
   */
  async calculateAllEmployees(year: number, month: number): Promise<EmployeeSalary[]> {
    const employees = await this.employeeRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
    });

    const results: EmployeeSalary[] = [];
    const errors: Array<{ employeeId: number; error: string }> = [];

    for (const employee of employees) {
      try {
        const salary = await this.calculateSalary(employee.id, year, month);
        results.push(salary);
      } catch (error: any) {
        errors.push({
          employeeId: employee.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Log errors but don't fail the entire operation
    if (errors.length > 0) {
      console.error('Errors calculating salaries:', errors);
    }

    return results;
  }

  /**
   * Get all salaries for a specific month
   */
  async getSalariesByMonth(year: number, month: number): Promise<EmployeeSalary[]> {
    // month is stored as Date (first day of the month)
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    return await this.salaryRepository
      .createQueryBuilder('salary')
      .leftJoinAndSelect('salary.employee', 'employee')
      .where('salary.month >= :monthStart', { monthStart })
      .andWhere('salary.month <= :monthEnd', { monthEnd })
      .orderBy('salary.employee_id', 'ASC')
      .getMany();
  }
}

