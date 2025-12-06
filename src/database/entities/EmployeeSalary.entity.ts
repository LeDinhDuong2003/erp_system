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

export enum SalaryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

@Entity({ name: 'employee_salary' })
export class EmployeeSalary {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'date' })
  month!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  base_salary!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  work_hours!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, default: 0 })
  bonus!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, default: 0 })
  allowance!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, default: 0, comment: 'Bảo hiểm' })
  insurance!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, default: 0, comment: 'Lương OT' })
  overtime_salary!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, default: 0, comment: 'Số giờ OT' })
  overtime_hours!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, default: 0, comment: 'Số ngày làm việc' })
  work_days!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, default: 0, comment: 'Số ngày nghỉ có phép (đã duyệt)' })
  approved_leave_days!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, default: 0 })
  deduction!: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  total_salary!: number | null;

  @Column({ type: 'enum', enum: SalaryStatus, default: SalaryStatus.PENDING })
  status!: SalaryStatus;

  @Column({ type: 'date', nullable: true })
  pay_date!: Date | null;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  payment_method!: PaymentMethod | null;

  @Column({ type: 'text', nullable: true })
  pay_slip_file!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}

