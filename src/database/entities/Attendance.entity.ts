import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Employee } from './Employee.entity';

@Entity({ name: 'attendance' })
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  check_in!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  check_out!: Date | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  work_hours!: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  late_minutes!: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  early_leave_minutes!: number | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}

