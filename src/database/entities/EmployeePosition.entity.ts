import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Employee } from './Employee.entity';
import { Department } from './Department.entity';
import { Position } from './Position.entity';

@Entity({ name: 'employee_positions' })
export class EmployeePosition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'int', nullable: true })
  department_id!: number | null;

  @Column({ type: 'int', nullable: true })
  position_id!: number | null;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date', nullable: true })
  end_date!: Date | null;

  @Column({ type: 'text', nullable: true })
  contract_file!: string | null;

  @Column({ type: 'boolean', default: false })
  is_current!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Employee, (emp) => emp.employee_positions)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Department, (dept) => dept.employee_positions)
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @ManyToOne(() => Position, (pos) => pos.employee_positions)
  @JoinColumn({ name: 'position_id' })
  position!: Position | null;
}

