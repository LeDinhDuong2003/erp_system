import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Employee } from './Employee.entity';

/**
 * AttendanceChallenge - Anti-fraud mechanism
 * 
 * Flow:
 * 1. Client requests a challenge token before check-in/check-out
 * 2. Server generates a unique token with timestamp and expected parameters
 * 3. Client must submit the token along with verification data
 * 4. Server validates token hasn't expired and data matches expectations
 * 
 * This prevents:
 * - Replay attacks (reusing old attendance data)
 * - Time manipulation (faking timestamps)
 * - Data tampering (modifying GPS or device data)
 */
@Entity({ name: 'attendance_challenges' })
@Index(['token'])
export class AttendanceChallenge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  employee_id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string; // Unique challenge token

  @Column({ type: 'varchar', length: 20 })
  action_type!: string; // 'CHECK_IN' or 'CHECK_OUT'

  @Column({ type: 'timestamptz' })
  expires_at!: Date; // Token expires in 5 minutes

  @Column({ type: 'boolean', default: false })
  is_used!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  used_at!: Date | null;

  // Expected device - must match on submission
  @Column({ type: 'varchar', length: 255, nullable: true })
  expected_device_id!: string | null;

  // Server timestamp when challenge was created
  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
}


