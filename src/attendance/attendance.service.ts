import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Attendance } from '../database/entities/Attendance.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private calculateWorkHours(checkIn: Date, checkOut: Date): number {
    if (!checkIn || !checkOut) return 0;
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }

  async create(createAttendanceDto: CreateAttendanceDto) {
    // Verify employee exists
    const employee = await this.employeeRepository.findOne({
      where: { id: createAttendanceDto.employee_id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if attendance already exists for this date
    const existing = await this.attendanceRepository.findOne({
      where: {
        employee_id: createAttendanceDto.employee_id,
        date: new Date(createAttendanceDto.date),
      },
    });

    if (existing) {
      throw new ConflictException('Attendance record already exists for this date');
    }

    const data: any = {
      ...createAttendanceDto,
      date: new Date(createAttendanceDto.date),
      check_in: createAttendanceDto.check_in ? new Date(createAttendanceDto.check_in) : null,
      check_out: createAttendanceDto.check_out ? new Date(createAttendanceDto.check_out) : null,
    };

    // Calculate work hours if both check_in and check_out are provided
    if (data.check_in && data.check_out) {
      data.work_hours = this.calculateWorkHours(data.check_in, data.check_out);
    }

    const attendance = this.attendanceRepository.create(data);
    const saved = await this.attendanceRepository.save(attendance);
    // Handle case where save might return array (shouldn't happen with single entity, but TypeScript types allow it)
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    const withEmployee = await this.attendanceRepository.findOne({
      where: { id: savedEntity.id },
      relations: ['employee'],
    });
    return withEmployee ? this.serializeAttendance(withEmployee) : this.serializeAttendance(savedEntity);
  }

  private serializeAttendance(attendance: Attendance): any {
    // Helper to safely convert Date to ISO string
    const toISOString = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      // Handle string dates
      if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
      return null;
    };

    // Helper to safely convert Date to date string (YYYY-MM-DD)
    // Handles both Date objects and string dates from database
    const toDateString = (date: Date | string | null | undefined): string | null => {
      if (!date) return null;
      
      // If it's already a string in YYYY-MM-DD format, return it
      if (typeof date === 'string') {
        // Check if it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        // Try to parse and convert
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        return null;
      }
      
      // If it's a Date object
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return null;
    };

    // Always use date field (user confirmed it always has data)
    const dateValue = toDateString(attendance.date);

    return {
      ...attendance,
      date: dateValue,
      check_in: toISOString(attendance.check_in),
      check_out: toISOString(attendance.check_out),
      created_at: toISOString(attendance.created_at),
      employee: attendance.employee
        ? {
            ...attendance.employee,
            last_login: toISOString(attendance.employee.last_login),
            created_at: toISOString(attendance.employee.created_at),
            updated_at: toISOString(attendance.employee.updated_at),
            email_verified_at: toISOString(attendance.employee.email_verified_at),
            face_registered_at: toISOString(attendance.employee.face_registered_at),
            locked_until: toISOString(attendance.employee.locked_until),
            dob: toDateString(attendance.employee.dob),
          }
        : null,
    };
  }

  async findAll(
    skip = 0,
    take = 10,
    employeeId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    if (employeeId) {
      where.employee_id = employeeId;
    }

    // Normalize dates for proper date comparison (only date part, no time)
    // With PostgreSQL date column, TypeORM compares date part only, but we normalize to be safe
    if (startDate && endDate) {
      // Parse dates and normalize to start of day for comparison
      // For date column type, PostgreSQL compares only the date part
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      // Add 1 day and subtract 1ms to include the entire end date
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(end.getMilliseconds() - 1);
      
      // Between includes both start and end dates
      where.date = Between(start, end);
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      where.date = Between(start, today);
    }

    const [attendances, total] = await Promise.all([
      this.attendanceRepository.find({
        where,
        skip,
        take,
        relations: ['employee'],
        order: { date: 'DESC' },
      }),
      this.attendanceRepository.count({ where }),
    ]);

    return {
      data: attendances.map((attendance) => this.serializeAttendance(attendance)),
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['employee'],
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return this.serializeAttendance(attendance);
  }

  async checkIn(employeeId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: {
        employee_id: employeeId,
        date: today,
      },
    });

    if (attendance && attendance.check_in) {
      throw new ConflictException('Already checked in today');
    }

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        employee_id: employeeId,
        date: today,
        check_in: new Date(),
      });
    } else {
      attendance.check_in = new Date();
    }

    const saved = await this.attendanceRepository.save(attendance);
    // Handle case where save might return array (shouldn't happen with single entity, but TypeScript types allow it)
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    const withEmployee = await this.attendanceRepository.findOne({
      where: { id: savedEntity.id },
      relations: ['employee'],
    });
    return withEmployee ? this.serializeAttendance(withEmployee) : this.serializeAttendance(savedEntity);
  }

  async checkOut(employeeId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceRepository.findOne({
      where: {
        employee_id: employeeId,
        date: today,
      },
    });

    if (!attendance) {
      throw new NotFoundException('No check-in record found for today');
    }

    if (!attendance.check_in) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.check_out) {
      throw new ConflictException('Already checked out today');
    }

    attendance.check_out = new Date();
    attendance.work_hours = this.calculateWorkHours(attendance.check_in, attendance.check_out);

    const saved = await this.attendanceRepository.save(attendance);
    // Handle case where save might return array (shouldn't happen with single entity, but TypeScript types allow it)
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    const withEmployee = await this.attendanceRepository.findOne({
      where: { id: savedEntity.id },
      relations: ['employee'],
    });
    return withEmployee ? this.serializeAttendance(withEmployee) : this.serializeAttendance(savedEntity);
  }

  async update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    const data: any = { ...updateAttendanceDto };

    if (updateAttendanceDto.date) {
      data.date = new Date(updateAttendanceDto.date);
    }

    if (updateAttendanceDto.check_in) {
      data.check_in = new Date(updateAttendanceDto.check_in);
    }

    if (updateAttendanceDto.check_out) {
      data.check_out = new Date(updateAttendanceDto.check_out);
    }

    // Recalculate work hours if both check_in and check_out are present
    if (data.check_in && data.check_out) {
      data.work_hours = this.calculateWorkHours(
        data.check_in instanceof Date ? data.check_in : new Date(data.check_in),
        data.check_out instanceof Date ? data.check_out : new Date(data.check_out),
      );
    } else if (attendance.check_in && data.check_out) {
      data.work_hours = this.calculateWorkHours(
        attendance.check_in,
        data.check_out instanceof Date ? data.check_out : new Date(data.check_out),
      );
    } else if (data.check_in && attendance.check_out) {
      data.work_hours = this.calculateWorkHours(
        data.check_in instanceof Date ? data.check_in : new Date(data.check_in),
        attendance.check_out,
      );
    }

    await this.attendanceRepository.update({ id }, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    await this.attendanceRepository.delete({ id });

    return { message: 'Attendance deleted successfully' };
  }
}

