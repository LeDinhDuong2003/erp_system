import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Role } from './Role.entity';
import { Employee } from './Employee.entity';

@Entity({ name: 'salary_settings' })
export class SalarySettings {
  @PrimaryGeneratedColumn()
  id!: number;

  // Lương chuẩn theo vai trò (nếu role_id có giá trị)
  @Column({ type: 'int', nullable: true, comment: 'Role ID - nếu null thì là setting cho employee cụ thể' })
  role_id!: number | null;

  // Lương chuẩn theo nhân viên (nếu employee_id có giá trị)
  @Column({ type: 'int', nullable: true, comment: 'Employee ID - nếu null thì là setting cho role' })
  employee_id!: number | null;

  // Lương cơ bản
  @Column({ type: 'numeric', precision: 14, scale: 2, comment: 'Lương cơ bản (VND)' })
  base_salary!: number;

  // Phụ cấp
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, comment: 'Phụ cấp (VND)' })
  allowance!: number;

  // Bảo hiểm (% lương cơ bản)
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 10.5, comment: 'Tỷ lệ bảo hiểm (%)' })
  insurance_rate!: number;

  // Hệ số lương (nếu có)
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 1.0, comment: 'Hệ số lương' })
  salary_coefficient!: number;

  // Lương theo giờ (tính từ lương cơ bản)
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, comment: 'Lương theo giờ (VND/giờ) - tự động tính từ base_salary' })
  hourly_rate!: number | null;

  // Hệ số OT (overtime)
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 1.5, comment: 'Hệ số lương làm thêm giờ' })
  overtime_rate!: number;

  // Hệ số lương ngày nghỉ
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 2.0, comment: 'Hệ số lương ngày nghỉ (nếu làm việc)' })
  holiday_rate!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee | null;
}

