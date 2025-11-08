import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
    return await this.attendanceRepository.save(attendance);
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

    if (startDate && endDate) {
      where.date = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.date = Between(new Date(startDate), new Date());
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
      data: attendances,
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

    return attendance;
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

    return await this.attendanceRepository.save(attendance);
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

    return await this.attendanceRepository.save(attendance);
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

