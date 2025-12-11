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

export enum HrRequestType {
  LEAVE = 'LEAVE', // Nghỉ phép
  OVERTIME = 'OVERTIME', // Làm thêm giờ
  LATE_EARLY = 'LATE_EARLY', // Đi muộn/Về sớm
}

export enum HrRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// Leave request specific enums
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID',
  OTHER = 'OTHER',
}

// Late/Early request specific enums
export enum LateEarlyType {
  LATE = 'LATE', // Đi muộn
  EARLY = 'EARLY', // Về sớm
}

@Entity({ name: 'hr_request' })
export class HrRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'enum', enum: HrRequestType, comment: 'Loại request: LEAVE, OVERTIME, LATE_EARLY' })
  request_type!: HrRequestType;

  @Column({ type: 'enum', enum: HrRequestStatus, default: HrRequestStatus.PENDING })
  status!: HrRequestStatus;

  // Common fields
  @Column({ type: 'text', nullable: true, comment: 'Lý do chung' })
  reason!: string | null;

  @Column({ type: 'int', nullable: true, comment: 'Người duyệt' })
  approved_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true, comment: 'Thời gian duyệt' })
  approved_at!: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Ghi chú từ người duyệt' })
  approval_note!: string | null;

  // Leave request specific fields
  @Column({ type: 'enum', enum: LeaveType, nullable: true, comment: 'Loại nghỉ phép (chỉ dùng khi request_type = LEAVE)' })
  leave_type!: LeaveType | null;

  @Column({ type: 'date', nullable: true, comment: 'Ngày bắt đầu nghỉ (chỉ dùng khi request_type = LEAVE)' })
  start_date!: Date | null;

  @Column({ type: 'date', nullable: true, comment: 'Ngày kết thúc nghỉ (chỉ dùng khi request_type = LEAVE)' })
  end_date!: Date | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, comment: 'Tổng số ngày nghỉ (chỉ dùng khi request_type = LEAVE)' })
  total_days!: number | null;

  // Overtime request specific fields
  @Column({ type: 'date', nullable: true, comment: 'Ngày làm thêm giờ (chỉ dùng khi request_type = OVERTIME)' })
  overtime_date!: Date | null;

  @Column({ type: 'time', nullable: true, comment: 'Giờ bắt đầu OT (chỉ dùng khi request_type = OVERTIME)' })
  start_time!: string | null;

  @Column({ type: 'time', nullable: true, comment: 'Giờ kết thúc OT (chỉ dùng khi request_type = OVERTIME)' })
  end_time!: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, comment: 'Số giờ OT (chỉ dùng khi request_type = OVERTIME)' })
  overtime_hours!: number | null;

  // Late/Early request specific fields
  @Column({ type: 'date', nullable: true, comment: 'Ngày đi muộn/về sớm (chỉ dùng khi request_type = LATE_EARLY)' })
  late_early_date!: Date | null;

  @Column({ type: 'enum', enum: LateEarlyType, nullable: true, comment: 'Loại: LATE hoặc EARLY (chỉ dùng khi request_type = LATE_EARLY)' })
  late_early_type!: LateEarlyType | null;

  @Column({ type: 'time', nullable: true, comment: 'Giờ thực tế (chỉ dùng khi request_type = LATE_EARLY)' })
  actual_time!: string | null;

  @Column({ type: 'int', nullable: true, comment: 'Số phút muộn/sớm (chỉ dùng khi request_type = LATE_EARLY)' })
  minutes!: number | null;

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

