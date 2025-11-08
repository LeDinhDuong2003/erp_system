import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../database/entities/Employee.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
    });
  }

  async validate(payload: any) {
    const employeeId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: [
        'employee_role_assignments',
        'employee_role_assignments.role',
        'employee_role_assignments.role.role_permissions',
        'employee_role_assignments.role.role_permissions.permission',
      ],
    });

    if (!employee) {
      return null;
    }

    return {
      id: employee.id,
      userId: employee.id,
      username: employee.username,
      email: employee.email,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      roles: employee.employee_role_assignments.map((er) => ({
        id: er.role.id,
        code: er.role.code,
        name: er.role.name,
        description: er.role.description,
      })),
    };
  }
}



