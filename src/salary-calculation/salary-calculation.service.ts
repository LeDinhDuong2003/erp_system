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

    // Calculate base salary - ensure it's a valid number
    const baseSalary = Number(salarySettings.base_salary) || 0;
    if (isNaN(baseSalary) || baseSalary <= 0) {
      throw new BadRequestException('Base salary must be a valid positive number');
    }

    // Calculate salary per day
    const salaryPerDay = baseSalary / 22; // Assuming 22 working days per month
    if (isNaN(salaryPerDay)) {
      throw new BadRequestException('Error calculating salary per day');
    }

    // Calculate salary based on work days
    const workDaysSalary = (workDays || 0) * salaryPerDay;
    if (isNaN(workDaysSalary)) {
      throw new BadRequestException('Error calculating work days salary');
    }

    // Calculate overtime salary
    const hourlyRate = Number(salarySettings.hourly_rate) || baseSalary / (8 * 22);
    const overtimeRate = Number(salarySettings.overtime_rate) || 1.5;
    const overtimeSalary = (overtimeHours || 0) * (isNaN(hourlyRate) ? 0 : hourlyRate) * (isNaN(overtimeRate) ? 1.5 : overtimeRate);
    if (isNaN(overtimeSalary)) {
      throw new BadRequestException('Error calculating overtime salary');
    }

    // Calculate allowance
    const allowance = Number(salarySettings.allowance) || 0;
    if (isNaN(allowance)) {
      throw new BadRequestException('Error calculating allowance');
    }

    // Calculate insurance (deduction)
    const insuranceRate = Number(salarySettings.insurance_rate) || 10.5;
    const insurance = (baseSalary * (isNaN(insuranceRate) ? 10.5 : insuranceRate)) / 100;
    if (isNaN(insurance)) {
      throw new BadRequestException('Error calculating insurance');
    }

    // Calculate deductions (late/early penalties if not approved)
    const deduction = this.calculateDeductions(
      attendances,
      approvedLateEarly,
      workSchedule,
      hourlyRate,
    );
    if (isNaN(deduction)) {
      throw new BadRequestException('Error calculating deductions');
    }

    // Calculate total salary - ensure all values are valid numbers
    const totalSalary = (workDaysSalary || 0) + (overtimeSalary || 0) + (allowance || 0) - (insurance || 0) - (deduction || 0);
    if (isNaN(totalSalary)) {
      throw new BadRequestException('Error calculating total salary');
    }

    // Create or update salary record - ensure all values are valid numbers
    const salaryData: Partial<EmployeeSalary> = {
      employee_id: employeeId,
      month: salaryDate,
      base_salary: isNaN(baseSalary) ? 0 : baseSalary,
      work_hours: isNaN(totalWorkHours) ? 0 : totalWorkHours,
      work_days: isNaN(workDays) ? 0 : workDays,
      approved_leave_days: approvedLeaves.reduce(
        (total, leave) => {
          const days = Number(leave.total_days) || 0;
          return total + (isNaN(days) ? 0 : days);
        },
        0,
      ),
      overtime_hours: isNaN(overtimeHours) ? 0 : overtimeHours,
      overtime_salary: isNaN(overtimeSalary) ? 0 : overtimeSalary,
      allowance: isNaN(allowance) ? 0 : allowance,
      insurance: isNaN(insurance) ? 0 : insurance,
      deduction: isNaN(deduction) ? 0 : deduction,
      bonus: 0, // Can be set manually
      total_salary: isNaN(totalSalary) ? 0 : Math.round(totalSalary * 100) / 100,
      status: existing?.status || SalaryStatus.PENDING,
    };

    if (existing) {
      Object.assign(existing, salaryData);
      const saved = await this.salaryRepository.save(existing);
      return this.serializeSalary(saved) as any;
    } else {
      const salary = this.salaryRepository.create(salaryData);
      const saved = await this.salaryRepository.save(salary);
      return this.serializeSalary(saved) as any;
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
    const total = attendances.reduce((total, att) => {
      if (att.work_hours) {
        const hours = Number(att.work_hours);
        return total + (isNaN(hours) ? 0 : hours);
      }
      return total;
    }, 0);
    return isNaN(total) ? 0 : total;
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
    const salary = await this.salaryRepository.findOne({
      where: {
        employee_id: employeeId,
        month: salaryDate,
      },
      relations: ['employee'],
    });
    return salary ? (this.serializeSalary(salary) as any) : null;
  }

  /**
   * Get all salaries for an employee
   */
  async getEmployeeSalaries(employeeId: number): Promise<EmployeeSalary[]> {
    const salaries = await this.salaryRepository.find({
      where: { employee_id: employeeId },
      relations: ['employee'],
      order: { month: 'DESC' },
    });
    return salaries.map((salary) => this.serializeSalary(salary)) as any;
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
    const saved = await this.salaryRepository.save(salary);
    return this.serializeSalary(saved) as any;
  }

  /**
   * Approve all salaries for a specific month
   */
  async approveAllSalaries(year: number, month: number): Promise<{ approved: number; failed: number; errors: Array<{ id: number; error: string }> }> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const salaries = await this.salaryRepository.find({
      where: {
        month: Between(monthStart, monthEnd),
        status: SalaryStatus.PENDING,
      },
    });

    let approved = 0;
    let failed = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const salary of salaries) {
      try {
        salary.status = SalaryStatus.APPROVED;
        await this.salaryRepository.save(salary);
        approved++;
      } catch (error: any) {
        failed++;
        errors.push({
          id: salary.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { approved, failed, errors };
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
    const saved = await this.salaryRepository.save(salary);
    return this.serializeSalary(saved) as any;
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
   * Serialize EmployeeSalary to ensure numeric values are properly converted
   */
  private serializeSalary(salary: EmployeeSalary): any {
    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value === 'number') {
        return isNaN(value) ? null : value;
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    return {
      ...salary,
      base_salary: toNumber(salary.base_salary),
      work_hours: toNumber(salary.work_hours),
      bonus: toNumber(salary.bonus),
      allowance: toNumber(salary.allowance),
      insurance: toNumber(salary.insurance),
      overtime_salary: toNumber(salary.overtime_salary),
      overtime_hours: toNumber(salary.overtime_hours),
      work_days: toNumber(salary.work_days),
      approved_leave_days: toNumber(salary.approved_leave_days),
      deduction: toNumber(salary.deduction),
      total_salary: toNumber(salary.total_salary),
    };
  }

  /**
   * Get all salaries for a specific month
   */
  async getSalariesByMonth(year: number, month: number): Promise<EmployeeSalary[]> {
    // month is stored as Date (first day of the month)
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const salaries = await this.salaryRepository
      .createQueryBuilder('salary')
      .leftJoinAndSelect('salary.employee', 'employee')
      .where('salary.month >= :monthStart', { monthStart })
      .andWhere('salary.month <= :monthEnd', { monthEnd })
      .orderBy('salary.employee_id', 'ASC')
      .getMany();

    return salaries.map((salary) => this.serializeSalary(salary)) as any;
  }
}

