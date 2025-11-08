import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Employee } from './Employee.entity';
import { Role } from './Role.entity';

@Entity({ name: 'employee_roles' })
export class EmployeeRoleAssignment {
  @PrimaryColumn({ type: 'int' })
  employee_id!: number;

  @PrimaryColumn({ type: 'int' })
  role_id!: number;

  @ManyToOne(() => Employee, (employee) => employee.employee_role_assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Role, (role) => role.employee_role_assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}


