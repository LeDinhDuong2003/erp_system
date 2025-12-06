import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalarySettings } from '../database/entities/SalarySettings.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Role } from '../database/entities/Role.entity';

@Injectable()
export class SalarySettingsService {
  constructor(
    @InjectRepository(SalarySettings)
    private readonly salarySettingsRepository: Repository<SalarySettings>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Get salary settings for a role
   */
  async getByRole(roleId: number): Promise<SalarySettings | null> {
    return await this.salarySettingsRepository.findOne({
      where: { role_id: roleId },
      relations: ['role'],
    });
  }

  /**
   * Get salary settings for an employee
   */
  async getByEmployee(employeeId: number): Promise<SalarySettings | null> {
    return await this.salarySettingsRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['employee'],
    });
  }

  /**
   * Get salary settings for employee (check employee-specific first, then role-based)
   */
  async getForEmployee(employeeId: number): Promise<SalarySettings | null> {
    // First check employee-specific settings
    const employeeSettings = await this.getByEmployee(employeeId);
    if (employeeSettings) {
      return employeeSettings;
    }

    // Then check role-based settings
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['employee_role_assignments', 'employee_role_assignments.role'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get the first role's salary settings
    if (employee.employee_role_assignments && employee.employee_role_assignments.length > 0) {
      const roleId = employee.employee_role_assignments[0].role.id;
      return await this.getByRole(roleId);
    }

    return null;
  }

  /**
   * Create or update salary settings for a role
   */
  async setForRole(roleId: number, settingsData: Partial<SalarySettings>): Promise<SalarySettings> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    let settings = await this.salarySettingsRepository.findOne({
      where: { role_id: roleId },
    });

    if (settings) {
      Object.assign(settings, settingsData);
    } else {
      settings = this.salarySettingsRepository.create({
        ...settingsData,
        role_id: roleId,
        employee_id: null,
      });
    }

    // Calculate hourly rate from base salary
    if (settings.base_salary && !settings.hourly_rate) {
      // Assuming 8 hours/day, 22 working days/month
      settings.hourly_rate = Number(settings.base_salary) / (8 * 22);
    }

    return await this.salarySettingsRepository.save(settings);
  }

  /**
   * Create or update salary settings for an employee
   */
  async setForEmployee(employeeId: number, settingsData: Partial<SalarySettings>): Promise<SalarySettings> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let settings = await this.salarySettingsRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (settings) {
      Object.assign(settings, settingsData);
    } else {
      settings = this.salarySettingsRepository.create({
        ...settingsData,
        employee_id: employeeId,
        role_id: null,
      });
    }

    // Calculate hourly rate from base salary
    if (settings.base_salary && !settings.hourly_rate) {
      // Assuming 8 hours/day, 22 working days/month
      settings.hourly_rate = Number(settings.base_salary) / (8 * 22);
    }

    return await this.salarySettingsRepository.save(settings);
  }

  /**
   * Delete salary settings
   */
  async delete(id: number): Promise<void> {
    const settings = await this.salarySettingsRepository.findOne({ where: { id } });
    if (!settings) {
      throw new NotFoundException('Salary settings not found');
    }
    await this.salarySettingsRepository.remove(settings);
  }

  /**
   * List all salary settings
   */
  async findAll(): Promise<SalarySettings[]> {
    return await this.salarySettingsRepository.find({
      relations: ['role', 'employee'],
    });
  }
}

