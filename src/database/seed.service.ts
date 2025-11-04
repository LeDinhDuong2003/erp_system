import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeRoleEnum, EmployeeStatus } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';
import { EmployeeRoleAssignment } from '../database/entities/EmployeeRoleAssignment.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(EmployeeRoleAssignment)
    private readonly employeeRoleAssignmentRepository: Repository<EmployeeRoleAssignment>,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    try {
      // Kiểm tra xem đã có super admin chưa
      const existingSuperAdmin = await this.employeeRepository.findOne({
        where: { username: 'superadmin' },
        relations: ['employee_role_assignments', 'employee_role_assignments.role'],
      });

      if (existingSuperAdmin) {
        this.logger.log('Super admin already exists');
        return;
      }

      // Tạo role SUPER_ADMIN nếu chưa có
      let superAdminRole = await this.roleRepository.findOne({ where: { code: 'SUPER_ADMIN' } });

      if (!superAdminRole) {
        const roleEntity = this.roleRepository.create({
          code: 'SUPER_ADMIN',
          name: 'Super Administrator',
          description:
            'Full system access, can create employees and manage all resources',
        });
        superAdminRole = await this.roleRepository.save(roleEntity);
        this.logger.log('Created SUPER_ADMIN role');
      }

      // Tạo super admin user
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const employeeEntity = this.employeeRepository.create({
        employee_code: 'SUPER_ADMIN_001',
        username: 'superadmin',
        email: 'superadmin@system.local',
        password_hash: passwordHash,
        full_name: 'Super Administrator',
        first_name: 'Super',
        last_name: 'Administrator',
        role: EmployeeRoleEnum.ADMIN,
        status: EmployeeStatus.ACTIVE,
        is_verified: true,
      });
      const superAdmin = await this.employeeRepository.save(employeeEntity);

      // Gán role SUPER_ADMIN cho super admin
      await this.employeeRoleAssignmentRepository.save(
        this.employeeRoleAssignmentRepository.create({
          employee_id: superAdmin.id,
          role_id: superAdminRole.id,
        }),
      );

      this.logger.log('✅ Super admin created successfully');
      this.logger.warn(
        `⚠️  Super admin credentials: username: superadmin, password: ${defaultPassword}`,
      );
      this.logger.warn('⚠️  Please change the default password after first login!');
    } catch (error) {
      this.logger.error('Error seeding super admin:', error);
    }
  }
}

