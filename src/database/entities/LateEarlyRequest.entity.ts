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

export enum LateEarlyType {
  LATE = 'LATE', // Đi muộn
  EARLY = 'EARLY', // Về sớm
}

export enum LateEarlyStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'late_early_request' })
export class LateEarlyRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'date', comment: 'Ngày đi muộn/về sớm' })
  date!: Date;

  @Column({ type: 'enum', enum: LateEarlyType, comment: 'Loại: LATE hoặc EARLY' })
  type!: LateEarlyType;

  @Column({ type: 'time', nullable: true, comment: 'Giờ thực tế (nếu đi muộn thì là giờ check-in, nếu về sớm thì là giờ check-out)' })
  actual_time!: string | null;

  @Column({ type: 'int', nullable: true, comment: 'Số phút muộn/sớm' })
  minutes!: number | null;

  @Column({ type: 'text', nullable: true, comment: 'Lý do' })
  reason!: string | null;

  @Column({ type: 'enum', enum: LateEarlyStatus, default: LateEarlyStatus.PENDING })
  status!: LateEarlyStatus;

  @Column({ type: 'int', nullable: true, comment: 'Người duyệt' })
  approved_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true, comment: 'Thời gian duyệt' })
  approved_at!: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Ghi chú từ người duyệt' })
  approval_note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'approved_by' })
  approver!: Employee | null;
}

