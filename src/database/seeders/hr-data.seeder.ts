import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Like } from 'typeorm';
import { Department } from '../entities/Department.entity';
import { Position } from '../entities/Position.entity';
import { Employee, EmployeeStatus } from '../entities/Employee.entity';
import { EmployeePosition } from '../entities/EmployeePosition.entity';
import { Role } from '../entities/Role.entity';
import { EmployeeRoleAssignment } from '../entities/EmployeeRoleAssignment.entity';
import { WorkScheduleSettings } from '../entities/WorkScheduleSettings.entity';
import { SalarySettings } from '../entities/SalarySettings.entity';
import { Attendance } from '../entities/Attendance.entity';
import { EmployeeSalary, SalaryStatus } from '../entities/EmployeeSalary.entity';
import { HrRequest } from '../entities/HrRequest.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HrDataSeeder {
  private readonly logger = new Logger(HrDataSeeder.name);

  // Helper function to remove Vietnamese accents
  private removeVietnameseAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeePosition)
    private readonly employeePositionRepository: Repository<EmployeePosition>,
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
    @InjectRepository(HrRequest)
    private readonly hrRequestRepository: Repository<HrRequest>,
  ) {}

  async seedAll() {
    this.logger.log('Starting HR data seeding...');
    
    try {
      // 0. Clear all existing HR data
      await this.clearAllData();
      this.logger.log('✓ Cleared all existing HR data');

      // 1. Seed Departments
      const departments = await this.seedDepartments();
      this.logger.log(`✓ Seeded ${departments.length} departments`);

      // 2. Seed Positions (after departments are created)
      const positions = await this.seedPositions(departments);
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

      // 6. Seed Employee Positions (many-to-many relationship)
      await this.seedEmployeePositions(employees, departments, positions);
      this.logger.log('✓ Seeded employee positions');

      // 7. Seed Attendance for October, November, and December (2025)
      await this.seedAttendance(employees, 2025, 10);
      await this.seedAttendance(employees, 2025, 11);
      await this.seedAttendance(employees, 2025, 12);
      await this.seedAttendance(employees, 2026, 1);
      this.logger.log('✓ Seeded attendance records for October, November, and December 2025');

      // 8. Seed Salary Records (2025)
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
    // Level 1: Root departments
    const rootDepartmentsData = [
      { name: 'Ban Giám đốc', description: 'Ban lãnh đạo cao cấp của công ty', parent_id: null },
      { name: 'Khối Kỹ thuật', description: 'Khối phụ trách kỹ thuật và phát triển sản phẩm', parent_id: null },
      { name: 'Khối Kinh doanh', description: 'Khối phụ trách kinh doanh và bán hàng', parent_id: null },
      { name: 'Khối Hành chính - Nhân sự', description: 'Khối quản lý hành chính và nhân sự', parent_id: null },
      { name: 'Khối Tài chính - Kế toán', description: 'Khối quản lý tài chính và kế toán', parent_id: null },
      { name: 'Khối Marketing - Truyền thông', description: 'Khối marketing và truyền thông', parent_id: null },
    ];

    const departments: Department[] = [];
    
    // Create root departments
    for (const deptData of rootDepartmentsData) {
      let dept = await this.departmentRepository.findOne({ where: { name: deptData.name } });
      if (!dept) {
        dept = this.departmentRepository.create({
          name: deptData.name,
          description: deptData.description,
          parent_id: deptData.parent_id,
        });
        dept = await this.departmentRepository.save(dept);
      }
      departments.push(dept);
    }

    // Level 2: Sub-departments
    const subDepartmentsData = [
      // Under Khối Kỹ thuật
      { name: 'Phòng Phát triển Phần mềm', parent: 'Khối Kỹ thuật', description: 'Phát triển phần mềm và ứng dụng' },
      { name: 'Phòng Hạ tầng & DevOps', parent: 'Khối Kỹ thuật', description: 'Quản lý hạ tầng và DevOps' },
      { name: 'Phòng QA & Testing', parent: 'Khối Kỹ thuật', description: 'Kiểm thử chất lượng sản phẩm' },
      { name: 'Phòng Nghiên cứu & Phát triển', parent: 'Khối Kỹ thuật', description: 'Nghiên cứu công nghệ mới' },
      
      // Under Khối Kinh doanh
      { name: 'Phòng Kinh doanh B2B', parent: 'Khối Kinh doanh', description: 'Kinh doanh doanh nghiệp' },
      { name: 'Phòng Kinh doanh B2C', parent: 'Khối Kinh doanh', description: 'Kinh doanh người tiêu dùng' },
      { name: 'Phòng Chăm sóc Khách hàng', parent: 'Khối Kinh doanh', description: 'Hỗ trợ và chăm sóc khách hàng' },
      { name: 'Phòng Quan hệ Đối tác', parent: 'Khối Kinh doanh', description: 'Quản lý quan hệ đối tác' },
      
      // Under Khối Hành chính - Nhân sự
      { name: 'Phòng Nhân sự', parent: 'Khối Hành chính - Nhân sự', description: 'Quản lý nhân sự và tuyển dụng' },
      { name: 'Phòng Hành chính', parent: 'Khối Hành chính - Nhân sự', description: 'Quản lý hành chính' },
      { name: 'Phòng Pháp chế', parent: 'Khối Hành chính - Nhân sự', description: 'Tư vấn pháp lý' },
      
      // Under Khối Tài chính - Kế toán
      { name: 'Phòng Kế toán', parent: 'Khối Tài chính - Kế toán', description: 'Kế toán và tài chính' },
      { name: 'Phòng Tài chính', parent: 'Khối Tài chính - Kế toán', description: 'Quản lý tài chính' },
      { name: 'Phòng Kiểm toán Nội bộ', parent: 'Khối Tài chính - Kế toán', description: 'Kiểm toán nội bộ' },
      
      // Under Khối Marketing - Truyền thông
      { name: 'Phòng Marketing', parent: 'Khối Marketing - Truyền thông', description: 'Marketing và quảng cáo' },
      { name: 'Phòng Truyền thông', parent: 'Khối Marketing - Truyền thông', description: 'Truyền thông và PR' },
      { name: 'Phòng Nội dung', parent: 'Khối Marketing - Truyền thông', description: 'Sản xuất nội dung' },
    ];

    for (const subDeptData of subDepartmentsData) {
      const parentDept = departments.find(d => d.name === subDeptData.parent);
      if (!parentDept) continue;

      let subDept = await this.departmentRepository.findOne({ 
        where: { name: subDeptData.name } 
      });
      if (!subDept) {
        subDept = this.departmentRepository.create({
          name: subDeptData.name,
          description: subDeptData.description,
          parent_id: parentDept.id,
        });
        subDept = await this.departmentRepository.save(subDept);
      }
      departments.push(subDept);
    }

    // Level 3: Teams under sub-departments
    const teamsData = [
      // Under Phòng Phát triển Phần mềm
      { name: 'Team Frontend', parent: 'Phòng Phát triển Phần mềm', description: 'Team phát triển giao diện' },
      { name: 'Team Backend', parent: 'Phòng Phát triển Phần mềm', description: 'Team phát triển backend' },
      { name: 'Team Mobile', parent: 'Phòng Phát triển Phần mềm', description: 'Team phát triển mobile' },
      { name: 'Team Full-stack', parent: 'Phòng Phát triển Phần mềm', description: 'Team full-stack' },
      
      // Under Phòng Kinh doanh B2B
      { name: 'Team Kinh doanh Miền Bắc', parent: 'Phòng Kinh doanh B2B', description: 'Kinh doanh khu vực miền Bắc' },
      { name: 'Team Kinh doanh Miền Trung', parent: 'Phòng Kinh doanh B2B', description: 'Kinh doanh khu vực miền Trung' },
      { name: 'Team Kinh doanh Miền Nam', parent: 'Phòng Kinh doanh B2B', description: 'Kinh doanh khu vực miền Nam' },
      
      // Under Phòng Nhân sự
      { name: 'Team Tuyển dụng', parent: 'Phòng Nhân sự', description: 'Team tuyển dụng nhân sự' },
      { name: 'Team Đào tạo', parent: 'Phòng Nhân sự', description: 'Team đào tạo và phát triển' },
      { name: 'Team C&B', parent: 'Phòng Nhân sự', description: 'Team chính sách và phúc lợi' },
    ];

    for (const teamData of teamsData) {
      const parentDept = departments.find(d => d.name === teamData.parent);
      if (!parentDept) continue;

      let team = await this.departmentRepository.findOne({ 
        where: { name: teamData.name } 
      });
      if (!team) {
        team = this.departmentRepository.create({
          name: teamData.name,
          description: teamData.description,
          parent_id: parentDept.id,
        });
        team = await this.departmentRepository.save(team);
      }
      departments.push(team);
    }

    return departments;
  }

  private async seedPositions(departments: Department[]): Promise<Position[]> {
    // Find departments by name for assignment
    const getDeptByName = (name: string) => departments.find(d => d.name === name);
    
    const positionsData = [
      // Management positions (no specific department)
      { title: 'Tổng Giám đốc', level: 1, description: 'Vị trí quản lý cấp cao nhất', department: null },
      { title: 'Phó Tổng Giám đốc', level: 2, description: 'Vị trí phó quản lý cấp cao nhất', department: null },
      { title: 'Giám đốc Khối', level: 2, description: 'Giám đốc khối', department: null },
      { title: 'Phó Giám đốc Khối', level: 3, description: 'Phó giám đốc khối', department: null },
      { title: 'Trưởng phòng', level: 3, description: 'Vị trí quản lý phòng ban', department: null },
      { title: 'Phó phòng', level: 4, description: 'Vị trí phó quản lý phòng ban', department: null },
      { title: 'Trưởng nhóm', level: 4, description: 'Vị trí quản lý nhóm', department: null },
      
      // Technical positions
      { title: 'Tech Lead', level: 3, description: 'Tech Lead', department: 'Phòng Phát triển Phần mềm' },
      { title: 'Senior Developer', level: 4, description: 'Lập trình viên cấp cao', department: 'Phòng Phát triển Phần mềm' },
      { title: 'Developer', level: 5, description: 'Lập trình viên', department: 'Phòng Phát triển Phần mềm' },
      { title: 'Junior Developer', level: 6, description: 'Lập trình viên mới', department: 'Phòng Phát triển Phần mềm' },
      { title: 'Frontend Developer', level: 5, description: 'Lập trình viên Frontend', department: 'Team Frontend' },
      { title: 'Backend Developer', level: 5, description: 'Lập trình viên Backend', department: 'Team Backend' },
      { title: 'Mobile Developer', level: 5, description: 'Lập trình viên Mobile', department: 'Team Mobile' },
      { title: 'Full-stack Developer', level: 5, description: 'Lập trình viên Full-stack', department: 'Team Full-stack' },
      { title: 'DevOps Engineer', level: 4, description: 'Kỹ sư DevOps', department: 'Phòng Hạ tầng & DevOps' },
      { title: 'QA Engineer', level: 5, description: 'Kỹ sư kiểm thử', department: 'Phòng QA & Testing' },
      { title: 'Senior QA Engineer', level: 4, description: 'Kỹ sư kiểm thử cấp cao', department: 'Phòng QA & Testing' },
      { title: 'R&D Engineer', level: 4, description: 'Kỹ sư nghiên cứu phát triển', department: 'Phòng Nghiên cứu & Phát triển' },
      
      // Sales positions
      { title: 'Trưởng phòng Kinh doanh', level: 3, description: 'Trưởng phòng kinh doanh', department: 'Phòng Kinh doanh B2B' },
      { title: 'Chuyên viên Kinh doanh', level: 5, description: 'Chuyên viên kinh doanh', department: 'Phòng Kinh doanh B2B' },
      { title: 'Chuyên viên Kinh doanh B2C', level: 5, description: 'Chuyên viên kinh doanh B2C', department: 'Phòng Kinh doanh B2C' },
      { title: 'Nhân viên Chăm sóc Khách hàng', level: 5, description: 'Nhân viên CSKH', department: 'Phòng Chăm sóc Khách hàng' },
      { title: 'Chuyên viên Quan hệ Đối tác', level: 5, description: 'Chuyên viên quan hệ đối tác', department: 'Phòng Quan hệ Đối tác' },
      
      // HR positions
      { title: 'Trưởng phòng Nhân sự', level: 3, description: 'Trưởng phòng nhân sự', department: 'Phòng Nhân sự' },
      { title: 'Chuyên viên Tuyển dụng', level: 5, description: 'Chuyên viên tuyển dụng', department: 'Team Tuyển dụng' },
      { title: 'Chuyên viên Đào tạo', level: 5, description: 'Chuyên viên đào tạo', department: 'Team Đào tạo' },
      { title: 'Chuyên viên C&B', level: 5, description: 'Chuyên viên chính sách và phúc lợi', department: 'Team C&B' },
      { title: 'Chuyên viên Hành chính', level: 5, description: 'Chuyên viên hành chính', department: 'Phòng Hành chính' },
      { title: 'Chuyên viên Pháp chế', level: 5, description: 'Chuyên viên pháp chế', department: 'Phòng Pháp chế' },
      
      // Finance positions
      { title: 'Trưởng phòng Kế toán', level: 3, description: 'Trưởng phòng kế toán', department: 'Phòng Kế toán' },
      { title: 'Kế toán trưởng', level: 3, description: 'Kế toán trưởng', department: 'Phòng Kế toán' },
      { title: 'Kế toán viên', level: 5, description: 'Kế toán viên', department: 'Phòng Kế toán' },
      { title: 'Chuyên viên Tài chính', level: 5, description: 'Chuyên viên tài chính', department: 'Phòng Tài chính' },
      { title: 'Kiểm toán viên', level: 5, description: 'Kiểm toán viên nội bộ', department: 'Phòng Kiểm toán Nội bộ' },
      
      // Marketing positions
      { title: 'Trưởng phòng Marketing', level: 3, description: 'Trưởng phòng marketing', department: 'Phòng Marketing' },
      { title: 'Chuyên viên Marketing', level: 5, description: 'Chuyên viên marketing', department: 'Phòng Marketing' },
      { title: 'Chuyên viên Truyền thông', level: 5, description: 'Chuyên viên truyền thông', department: 'Phòng Truyền thông' },
      { title: 'Content Creator', level: 5, description: 'Người sáng tạo nội dung', department: 'Phòng Nội dung' },
      { title: 'Copywriter', level: 5, description: 'Người viết nội dung', department: 'Phòng Nội dung' },
      
      // General positions
      { title: 'Nhân viên', level: 5, description: 'Vị trí nhân viên', department: null },
      { title: 'Thực tập sinh', level: 6, description: 'Vị trí thực tập', department: null },
    ];

    const positions: Position[] = [];
    for (const posData of positionsData) {
      const dept = posData.department ? getDeptByName(posData.department) : null;
      const deptId = dept?.id || null;
      
      let pos = await this.positionRepository.findOne({ 
        where: { 
          title: posData.title,
          department_id: deptId === null ? IsNull() : deptId,
        } 
      });
      if (!pos) {
        pos = this.positionRepository.create({
          title: posData.title,
          level: posData.level,
          description: posData.description,
          department_id: deptId,
        });
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
    // Generate Vietnamese names
    const firstNames = ['Văn', 'Thị', 'Đức', 'Minh', 'Hồng', 'Thanh', 'Quang', 'Linh', 'Tuấn', 'Hương', 'Dũng', 'Lan', 'Anh', 'Hùng', 'Nga'];
    const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vương', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Võ', 'Dương', 'Lý', 'Phan', 'Vũ'];
    const middleNames = ['Văn', 'Thị', 'Đức', 'Minh', 'Hồng', 'Thanh', 'Quang', 'Linh', 'Tuấn', 'Hương'];

    const employeesData: Array<{
      employee_code: string;
      username: string;
      email: string;
      full_name: string;
      phone: string;
      status: EmployeeStatus;
      password: string;
      roleCode: string;
      base_salary: number;
      allowance: number;
      insurance_rate: number;
      overtime_rate: number;
    }> = [];

    // Generate 50 employees with random data
    for (let i = 1; i <= 50; i++) {
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const fullName = `${lastName} ${middleName} ${firstName}`;
      const username = `${this.removeVietnameseAccents(lastName.toLowerCase())}${this.removeVietnameseAccents(middleName.toLowerCase())}${this.removeVietnameseAccents(firstName.toLowerCase())}${i}`;
      const email = `${username}@company.com`;
      const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      
      // Random salary based on level (higher level = higher salary)
      const level = Math.floor(Math.random() * 6) + 1;
      const baseSalary = 8000000 + (7 - level) * 2000000 + Math.floor(Math.random() * 3000000);
      const allowance = Math.floor(baseSalary * 0.1) + Math.floor(Math.random() * 2000000);
      
      employeesData.push({
        employee_code: `NV${String(i).padStart(3, '0')}`,
        username,
        email,
        full_name: fullName,
        phone,
        status: Math.random() > 0.1 ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE,
        password: '123456',
        roleCode: i <= 3 ? 'MANAGER' : i <= 8 ? 'HR' : 'EMPLOYEE',
        base_salary: baseSalary,
        allowance,
        insurance_rate: 10.5,
        overtime_rate: 1.5,
      });
    }

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

  private async seedEmployeePositions(
    employees: Employee[],
    departments: Department[],
    positions: Position[],
  ): Promise<void> {
    // Assign positions to employees
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      // Check if employee already has positions
      const existingPositions = await this.employeePositionRepository.find({
        where: { employee_id: employee.id },
      });
      
      if (existingPositions.length > 0) {
        continue; // Skip if already has positions
      }

      // Each employee can have 1-3 positions in different departments
      const numPositions = Math.floor(Math.random() * 3) + 1;
      const assignedPositions: Array<{ dept: Department | null; pos: Position; isCurrent: boolean }> = [];

      for (let j = 0; j < numPositions; j++) {
        let dept: Department | null = null;
        let pos: Position | undefined;

        // Randomly assign to different departments
        if (j === 0) {
          // First position - main position
          const deptIndex = Math.floor(Math.random() * departments.length);
          dept = departments[deptIndex];
          // Find a position in this department or without department
          if (dept) {
            const deptId = dept.id;
            const deptPositions = positions.filter(p => p.department_id === deptId || p.department_id === null);
            if (deptPositions.length > 0) {
              pos = deptPositions[Math.floor(Math.random() * deptPositions.length)];
            }
          }
        } else {
          // Additional positions - can be in different departments
          const deptIndex = Math.floor(Math.random() * departments.length);
          dept = departments[deptIndex];
          if (dept) {
            const deptId = dept.id;
            const deptPositions = positions.filter(p => p.department_id === deptId || p.department_id === null);
            if (deptPositions.length > 0) {
              pos = deptPositions[Math.floor(Math.random() * deptPositions.length)];
            }
          }
        }

        if (!pos) {
          // Fallback to any position
          pos = positions[Math.floor(Math.random() * positions.length)];
        }

        if (pos && !assignedPositions.find(ap => ap.dept?.id === dept?.id && ap.pos.id === pos.id)) {
          assignedPositions.push({
            dept,
            pos,
            isCurrent: j === 0, // First position is current
          });
        }
      }

      // Create employee positions
      for (let j = 0; j < assignedPositions.length; j++) {
        const { dept, pos, isCurrent } = assignedPositions[j];
        const startDate = new Date(2024, 0, 1 + j * 30); // Stagger start dates
        const endDate = j < assignedPositions.length - 1 ? new Date(2024, 11, 31) : null;

        const employeePosition = this.employeePositionRepository.create({
          employee_id: employee.id,
          department_id: dept?.id || null,
          position_id: pos.id,
          start_date: startDate,
          end_date: endDate,
          is_current: isCurrent,
        });
        await this.employeePositionRepository.save(employeePosition);
      }
    }
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
        } as any);
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

  private async clearAllData() {
    this.logger.log('Clearing existing HR data...');
    
    try {
      // Delete in reverse order of dependencies to avoid foreign key constraints
      
      // 1. Delete salary records (depends on Employee)
      const deletedSalaries = await this.salaryRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedSalaries.affected || 0} salary records`);

      // 2. Delete attendance records (depends on Employee)
      const deletedAttendance = await this.attendanceRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedAttendance.affected || 0} attendance records`);

      // 3. Delete salary settings (depends on Employee)
      const deletedSalarySettings = await this.salarySettingsRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedSalarySettings.affected || 0} salary settings`);

      // 4. Delete HR requests (depends on Employee)
      const deletedHrRequests = await this.hrRequestRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedHrRequests.affected || 0} HR requests`);

      // 5. Delete employee positions (depends on Employee, Department, Position)
      const deletedEmployeePositions = await this.employeePositionRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedEmployeePositions.affected || 0} employee positions`);

      // 6. Delete employee role assignments (depends on Employee, Role)
      // Note: We don't delete all role assignments, only HR-related ones
      // Super admin role assignments should be kept
      // Get HR employees first before deleting them
      const hrEmployees = await this.employeeRepository.find({
        where: { employee_code: Like('NV%') },
      });
      if (hrEmployees.length > 0) {
        const hrEmployeeIds = hrEmployees.map(e => e.id);
        const deletedRoleAssignments = await this.employeeRoleAssignmentRepository
          .createQueryBuilder()
          .delete()
          .where('employee_id IN (:...ids)', { ids: hrEmployeeIds })
          .execute();
        this.logger.log(`  Deleted ${deletedRoleAssignments.affected || 0} employee role assignments`);
      }

      // 7. Delete employees (only HR-seeded employees, keep super admin)
      const deletedEmployees = await this.employeeRepository
        .createQueryBuilder()
        .delete()
        .where('employee_code LIKE :pattern', { pattern: 'NV%' })
        .execute();
      this.logger.log(`  Deleted ${deletedEmployees.affected || 0} employees`);

      // 8. Delete positions (depends on Department)
      const deletedPositions = await this.positionRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedPositions.affected || 0} positions`);

      // 9. Delete departments (handle parent-child relationships)
      // First, set all parent_id to null to break relationships
      await this.departmentRepository
        .createQueryBuilder()
        .update(Department)
        .set({ parent_id: null })
        .execute();

      // Then delete all departments
      const deletedDepartments = await this.departmentRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedDepartments.affected || 0} departments`);

      // 10. Delete work schedule settings
      const deletedWorkSchedule = await this.workScheduleRepository
        .createQueryBuilder()
        .delete()
        .execute();
      this.logger.log(`  Deleted ${deletedWorkSchedule.affected || 0} work schedule settings`);

      // Note: We don't delete Roles as they might be used by super admin
      this.logger.log('  Kept roles (may be used by super admin)');
      
    } catch (error: any) {
      // If table doesn't exist, log warning and continue
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        this.logger.warn('⚠️  Some tables may not exist, skipping deletion');
        return;
      }
      throw error;
    }
  }
}

