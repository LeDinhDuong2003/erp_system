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

export enum OvertimeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'overtime_request' })
export class OvertimeRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'date', comment: 'Ngày làm thêm giờ' })
  date!: Date;

  @Column({ type: 'time', comment: 'Giờ bắt đầu OT (HH:mm:ss)' })
  start_time!: string;

  @Column({ type: 'time', comment: 'Giờ kết thúc OT (HH:mm:ss)' })
  end_time!: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, comment: 'Số giờ OT' })
  hours!: number | null;

  @Column({ type: 'text', nullable: true, comment: 'Lý do làm thêm giờ' })
  reason!: string | null;

  @Column({ type: 'enum', enum: OvertimeStatus, default: OvertimeStatus.PENDING })
  status!: OvertimeStatus;

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

