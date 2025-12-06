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

  // Photo verification - S3 URLs
  @Column({ type: 'text', nullable: true })
  check_in_photo_url!: string | null;

  @Column({ type: 'text', nullable: true })
  check_out_photo_url!: string | null;

  // GPS verification
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  check_in_latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  check_in_longitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  check_out_latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  check_out_longitude!: number | null;

  @Column({ type: 'int', nullable: true })
  gps_accuracy!: number | null;

  // Device verification
  @Column({ type: 'varchar', length: 255, nullable: true })
  device_id!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string | null;

  // Verification status
  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'text', nullable: true })
  verification_notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}
