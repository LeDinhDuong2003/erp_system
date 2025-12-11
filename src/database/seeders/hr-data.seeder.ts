import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Department } from '../entities/Department.entity';
import { Position } from '../entities/Position.entity';
import { Employee, EmployeeStatus } from '../entities/Employee.entity';
import { Role } from '../entities/Role.entity';
import { EmployeeRoleAssignment } from '../entities/EmployeeRoleAssignment.entity';
import { WorkScheduleSettings } from '../entities/WorkScheduleSettings.entity';
import { SalarySettings } from '../entities/SalarySettings.entity';
import { Attendance } from '../entities/Attendance.entity';
import { EmployeeSalary, SalaryStatus } from '../entities/EmployeeSalary.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HrDataSeeder {
  private readonly logger = new Logger(HrDataSeeder.name);

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(EmployeeRoleAssignment)
    private readonly employeeRoleAssignmentRepository: Repository<EmployeeRoleAssignment>,
    @InjectRepository(WorkScheduleSettings)
    private readonly workScheduleRepository: Repository<WorkScheduleSettings>,
    @InjectRepository(SalarySettings)
    private readonly salarySettingsRepository: Repository<SalarySettings>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(EmployeeSalary)
    private readonly salaryRepository: Repository<EmployeeSalary>,
  ) {}

  async seedAll() {
    this.logger.log('Starting HR data seeding...');
    
    try {
      // 1. Seed Departments
      const departments = await this.seedDepartments();
      this.logger.log(`✓ Seeded ${departments.length} departments`);

      // 2. Seed Positions
      const positions = await this.seedPositions();
      this.logger.log(`✓ Seeded ${positions.length} positions`);

      // 3. Seed Roles (if not exist)
      const roles = await this.seedRoles();
      this.logger.log(`✓ Seeded ${roles.length} roles`);

      // 4. Seed Work Schedule Settings
      await this.seedWorkSchedule();
      this.logger.log('✓ Seeded work schedule settings');

      // 5. Seed Employees with Salary Settings
      const employees = await this.seedEmployees(departments, positions, roles);
      this.logger.log(`✓ Seeded ${employees.length} employees`);

      // 6. Seed Attendance for October, November, and December (2025)
      await this.seedAttendance(employees, 2025, 10);
      await this.seedAttendance(employees, 2025, 11);
      await this.seedAttendance(employees, 2025, 12);
      this.logger.log('✓ Seeded attendance records for October, November, and December 2025');

      // 7. Seed Salary Records (2025)
      await this.seedSalaryRecords(employees, 2025, 10);
      await this.seedSalaryRecords(employees, 2025, 11);
      await this.seedSalaryRecords(employees, 2025, 12);
      this.logger.log('✓ Seeded salary records for October, November, and December 2025');

      this.logger.log('✅ HR data seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Error seeding HR data:', error);
      throw error;
    }
  }

  private async seedDepartments(): Promise<Department[]> {
    const departmentsData = [
      { name: 'Phòng Kỹ thuật', description: 'Phòng ban phụ trách kỹ thuật và phát triển sản phẩm' },
      { name: 'Phòng Kinh doanh', description: 'Phòng ban phụ trách kinh doanh và bán hàng' },
      { name: 'Phòng Nhân sự', description: 'Phòng ban quản lý nhân sự và tuyển dụng' },
      { name: 'Phòng Kế toán', description: 'Phòng ban quản lý tài chính và kế toán' },
      { name: 'Phòng Marketing', description: 'Phòng ban marketing và truyền thông' },
      { name: 'Phòng Hành chính', description: 'Phòng ban hành chính và quản trị' },
    ];

    const departments: Department[] = [];
    for (const deptData of departmentsData) {
      let dept = await this.departmentRepository.findOne({ where: { name: deptData.name } });
      if (!dept) {
        dept = this.departmentRepository.create(deptData);
        dept = await this.departmentRepository.save(dept);
      }
      departments.push(dept);
    }
    return departments;
  }

  private async seedPositions(): Promise<Position[]> {
    const positionsData = [
      { title: 'Giám đốc', level: 1, description: 'Vị trí quản lý cấp cao nhất' },
      { title: 'Phó giám đốc', level: 2, description: 'Vị trí quản lý cấp cao' },
      { title: 'Trưởng phòng', level: 3, description: 'Vị trí quản lý phòng ban' },
      { title: 'Phó phòng', level: 4, description: 'Vị trí phó quản lý phòng ban' },
      { title: 'Nhân viên', level: 5, description: 'Vị trí nhân viên' },
      { title: 'Thực tập sinh', level: 6, description: 'Vị trí thực tập' },
      { title: 'Senior Developer', level: 4, description: 'Lập trình viên cấp cao' },
      { title: 'Developer', level: 5, description: 'Lập trình viên' },
      { title: 'Junior Developer', level: 6, description: 'Lập trình viên mới' },
      { title: 'Chuyên viên Kinh doanh', level: 5, description: 'Chuyên viên kinh doanh' },
      { title: 'Chuyên viên Nhân sự', level: 5, description: 'Chuyên viên nhân sự' },
      { title: 'Kế toán viên', level: 5, description: 'Kế toán viên' },
    ];

    const positions: Position[] = [];
    for (const posData of positionsData) {
      let pos = await this.positionRepository.findOne({ where: { title: posData.title } });
      if (!pos) {
        pos = this.positionRepository.create(posData);
        pos = await this.positionRepository.save(pos);
      }
      positions.push(pos);
    }
    return positions;
  }

  private async seedRoles(): Promise<Role[]> {
    const rolesData = [
      { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Full system access' },
      { code: 'MANAGER', name: 'Manager', description: 'Manager access' },
      { code: 'HR', name: 'HR Staff', description: 'Human Resources staff' },
      { code: 'EMPLOYEE', name: 'Employee', description: 'Regular employee' },
    ];

    const roles: Role[] = [];
    for (const roleData of rolesData) {
      let role = await this.roleRepository.findOne({ where: { code: roleData.code } });
      if (!role) {
        role = this.roleRepository.create(roleData);
        role = await this.roleRepository.save(role);
      }
      roles.push(role);
    }
    return roles;
  }

  private async seedWorkSchedule() {
    try {
      const existing = await this.workScheduleRepository.findOne({ where: {} });
      if (existing) {
        this.logger.log('Work schedule settings already exist, skipping...');
        return;
      }
    } catch (error: any) {
      // If table doesn't exist, log warning and skip
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        this.logger.warn('⚠️  Table work_schedule_settings does not exist. Please run migration or create table manually.');
        this.logger.warn('   SQL script available at: create_work_schedule_settings.sql');
        return;
      }
      throw error;
    }

    const workSchedule = this.workScheduleRepository.create({
      standard_check_in_time: '08:00:00',
      standard_check_out_time: '17:00:00',
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      standard_work_hours_per_day: 8.0,
      late_tolerance_minutes: 15,
      early_leave_tolerance_minutes: 15,
    });
    await this.workScheduleRepository.save(workSchedule);
  }

  private async seedEmployees(
    departments: Department[],
    positions: Position[],
    roles: Role[],
  ): Promise<Employee[]> {
    const employeesData = [
      {
        employee_code: 'NV001',
        username: 'nguyenvana',
        email: 'nguyenvana@example.com',
        full_name: 'Nguyễn Văn A',
        phone: '0901234567',
        department: departments[0].name, // Phòng Kỹ thuật
        position: positions[6].title, // Senior Developer
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 15000000,
        allowance: 2000000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV002',
        username: 'tranthib',
        email: 'tranthib@example.com',
        full_name: 'Trần Thị B',
        phone: '0901234568',
        department: departments[1].name, // Phòng Kinh doanh
        position: positions[9].title, // Chuyên viên Kinh doanh
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 12000000,
        allowance: 1500000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV003',
        username: 'levanc',
        email: 'levanc@example.com',
        full_name: 'Lê Văn C',
        phone: '0901234569',
        department: departments[2].name, // Phòng Nhân sự
        position: positions[10].title, // Chuyên viên Nhân sự
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'HR',
        base_salary: 13000000,
        allowance: 1800000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV004',
        username: 'phamthid',
        email: 'phamthid@example.com',
        full_name: 'Phạm Thị D',
        phone: '0901234570',
        department: departments[3].name, // Phòng Kế toán
        position: positions[11].title, // Kế toán viên
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 11000000,
        allowance: 1000000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV005',
        username: 'hoangvane',
        email: 'hoangvane@example.com',
        full_name: 'Hoàng Văn E',
        phone: '0901234571',
        department: departments[0].name, // Phòng Kỹ thuật
        position: positions[7].title, // Developer
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 10000000,
        allowance: 1000000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV006',
        username: 'vuongthif',
        email: 'vuongthif@example.com',
        full_name: 'Vương Thị F',
        phone: '0901234572',
        department: departments[4].name, // Phòng Marketing
        position: positions[5].title, // Nhân viên
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 9000000,
        allowance: 500000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV007',
        username: 'dangvang',
        email: 'dangvang@example.com',
        full_name: 'Đặng Văn G',
        phone: '0901234573',
        department: departments[5].name, // Phòng Hành chính
        position: positions[3].title, // Phó phòng
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'MANAGER',
        base_salary: 18000000,
        allowance: 3000000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
      {
        employee_code: 'NV008',
        username: 'buitthih',
        email: 'buitthih@example.com',
        full_name: 'Bùi Thị H',
        phone: '0901234574',
        department: departments[0].name, // Phòng Kỹ thuật
        position: positions[8].title, // Junior Developer
        status: EmployeeStatus.ACTIVE,
        password: '123456',
        roleCode: 'EMPLOYEE',
        base_salary: 8000000,
        allowance: 500000,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      },
    ];

    const employees: Employee[] = [];
    for (const empData of employeesData) {
      let employee = await this.employeeRepository.findOne({
        where: { username: empData.username },
      });

      if (!employee) {
        const passwordHash = await bcrypt.hash(empData.password, 10);
        employee = this.employeeRepository.create({
          employee_code: empData.employee_code,
          username: empData.username,
          email: empData.email,
          full_name: empData.full_name,
          phone: empData.phone,
          department: empData.department,
          position: empData.position,
          status: empData.status,
          password_hash: passwordHash,
          is_verified: true,
          email_verified_at: new Date(),
        });
        employee = await this.employeeRepository.save(employee);

        // Assign role
        const role = roles.find((r) => r.code === empData.roleCode);
        if (role) {
          const assignment = this.employeeRoleAssignmentRepository.create({
            employee_id: employee.id,
            role_id: role.id,
          });
          await this.employeeRoleAssignmentRepository.save(assignment);
        }

        // Create salary settings
        const salarySettings = this.salarySettingsRepository.create({
          employee_id: employee.id,
          role_id: null,
          base_salary: empData.base_salary,
          allowance: empData.allowance,
          insurance_rate: empData.insurance_rate,
          overtime_rate: empData.overtime_rate,
          hourly_rate: empData.base_salary / (8 * 22), // Calculate hourly rate
        });
        await this.salarySettingsRepository.save(salarySettings);
      }
      employees.push(employee);
    }
    return employees;
  }

  private async seedAttendance(employees: Employee[], year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const workSchedule = await this.workScheduleRepository.findOne({ where: {} });

    if (!workSchedule) {
      this.logger.warn('Work schedule not found, skipping attendance seeding');
      return;
    }

    for (const employee of employees) {
      // Check if attendance already exists for this month
      const existingCount = await this.attendanceRepository.count({
        where: {
          employee_id: employee.id,
        },
      });
      if (existingCount > 0) {
        // Check if this specific month is already seeded
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const monthAttendance = await this.attendanceRepository
          .createQueryBuilder('attendance')
          .where('attendance.employee_id = :employeeId', { employeeId: employee.id })
          .andWhere('attendance.date >= :startDate', { startDate: monthStart })
          .andWhere('attendance.date <= :endDate', { endDate: monthEnd })
          .getCount();
        if (monthAttendance > 0) {
          continue; // Skip if already seeded
        }
      }

      // Generate attendance for each working day
      for (let day = 1; day <= endDate.getDate(); day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // Check if it's a working day
        let isWorkingDay = false;
        switch (dayOfWeek) {
          case 0:
            isWorkingDay = workSchedule.sunday;
            break;
          case 1:
            isWorkingDay = workSchedule.monday;
            break;
          case 2:
            isWorkingDay = workSchedule.tuesday;
            break;
          case 3:
            isWorkingDay = workSchedule.wednesday;
            break;
          case 4:
            isWorkingDay = workSchedule.thursday;
            break;
          case 5:
            isWorkingDay = workSchedule.friday;
            break;
          case 6:
            isWorkingDay = workSchedule.saturday;
            break;
        }

        if (!isWorkingDay) continue;

        // Random check-in time (between 7:45 and 8:15)
        const checkInHour = 8;
        const checkInMinute = Math.floor(Math.random() * 30); // 0-29 minutes
        const checkInTime = new Date(year, month - 1, day, checkInHour, checkInMinute);

        // Random check-out time (between 17:00 and 18:00)
        const checkOutHour = 17;
        const checkOutMinute = Math.floor(Math.random() * 60); // 0-59 minutes
        const checkOutTime = new Date(year, month - 1, day, checkOutHour, checkOutMinute);

        // Calculate late minutes (if check-in after 8:15)
        const standardCheckIn = new Date(year, month - 1, day, 8, 15);
        const lateMinutes = checkInTime > standardCheckIn
          ? Math.floor((checkInTime.getTime() - standardCheckIn.getTime()) / (1000 * 60))
          : 0;

        // Calculate early leave minutes (if check-out before 17:00)
        const standardCheckOut = new Date(year, month - 1, day, 17, 0);
        const earlyLeaveMinutes = checkOutTime < standardCheckOut
          ? Math.floor((standardCheckOut.getTime() - checkOutTime.getTime()) / (1000 * 60))
          : 0;

        // Calculate work hours
        const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        // Create attendance record (one record per day with both check-in and check-out)
        const attendance = this.attendanceRepository.create({
          employee_id: employee.id,
          date: date,
          check_in: checkInTime,
          check_out: checkOutTime,
          work_hours: workHours,
          late_minutes: lateMinutes,
          early_leave_minutes: earlyLeaveMinutes,
          check_in_photo_url: `https://example.com/attendance/${employee.id}/${date.toISOString()}_checkin.jpg`,
          check_out_photo_url: `https://example.com/attendance/${employee.id}/${date.toISOString()}_checkout.jpg`,
          is_verified: true,
        });
        await this.attendanceRepository.save(attendance);
      }
    }
  }

  private async seedSalaryRecords(employees: Employee[], year: number, month: number) {
    for (const employee of employees) {
      // Check if salary record already exists
      const monthDate = new Date(year, month - 1, 1);
      const existing = await this.salaryRepository.findOne({
        where: {
          employee_id: employee.id,
          month: monthDate,
        },
      });

      if (existing) {
        continue; // Skip if already exists
      }

      // Get salary settings
      const salarySettings = await this.salarySettingsRepository.findOne({
        where: { employee_id: employee.id },
      });

      if (!salarySettings) {
        continue; // Skip if no salary settings
      }

      // Get attendance for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const attendances = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .where('attendance.employee_id = :employeeId', { employeeId: employee.id })
        .andWhere('attendance.date >= :startDate', { startDate })
        .andWhere('attendance.date <= :endDate', { endDate })
        .getMany();

      // Calculate work days (unique dates with both check-in and check-out)
      const workDays = attendances.filter(
        (a) => a.check_in !== null && a.check_out !== null,
      ).length;

      // Calculate work hours (assuming 8 hours per day)
      const workHours = workDays * 8;

      // Calculate base salary
      const baseSalary = Number(salarySettings.base_salary) || 0;
      const salaryPerDay = baseSalary / 22; // Assuming 22 working days per month
      const workDaysSalary = workDays * salaryPerDay;

      // Random overtime hours (0-20 hours)
      const overtimeHours = Math.floor(Math.random() * 20);
      const hourlyRate = Number(salarySettings.hourly_rate) || baseSalary / (8 * 22);
      const overtimeRate = Number(salarySettings.overtime_rate) || 1.5;
      const overtimeSalary = overtimeHours * hourlyRate * overtimeRate;

      // Calculate allowance
      const allowance = Number(salarySettings.allowance) || 0;

      // Calculate insurance
      const insuranceRate = Number(salarySettings.insurance_rate) || 10.5;
      const insurance = (baseSalary * insuranceRate) / 100;

      // Calculate total salary
      const totalSalary = workDaysSalary + overtimeSalary + allowance - insurance;

      // Create salary record
      const salary = this.salaryRepository.create({
        employee_id: employee.id,
        month: monthDate,
        base_salary: baseSalary,
        work_hours: workHours,
        work_days: workDays,
        approved_leave_days: 0,
        overtime_hours: overtimeHours,
        overtime_salary: overtimeSalary,
        allowance: allowance,
        insurance: insurance,
        deduction: 0,
        bonus: 0,
        total_salary: totalSalary,
        status: SalaryStatus.PENDING,
      });
      await this.salaryRepository.save(salary);
    }
  }
}

