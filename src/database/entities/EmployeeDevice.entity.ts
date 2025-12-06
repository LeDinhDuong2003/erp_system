import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from './Employee.entity';

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

@Entity({ name: 'employee_devices' })
@Index(['employee_id', 'device_id'], { unique: true })
export class EmployeeDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'varchar', length: 255 })
  device_id!: string; // Fingerprint hash

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name!: string | null; // User-friendly name like "iPhone 14 Pro"

  @Column({ type: 'varchar', length: 50, nullable: true })
  device_type!: string | null; // mobile, desktop, tablet

  @Column({ type: 'varchar', length: 100, nullable: true })
  os!: string | null; // Windows 11, macOS, iOS, Android

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser!: string | null; // Chrome, Safari, Firefox

  @Column({ type: 'varchar', length: 50, nullable: true })
  screen_resolution!: string | null; // e.g., "1920x1080"

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.ACTIVE,
  })
  status!: DeviceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at!: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  last_ip_address!: string | null;

  @Column({ type: 'boolean', default: false })
  is_primary!: boolean; // Primary device for this employee

  @Column({ type: 'int', nullable: true })
  registered_by!: number | null; // Admin who approved this device

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'registered_by' })
  registeredByEmployee!: Employee;
}


