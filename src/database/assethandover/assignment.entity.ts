import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from '../assetmanagement/asset.entity';
import { Employee } from '../entities/Employee.entity';

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  RETURNED = 'RETURNED',
}

@Entity({ name: 'assignment_history' })
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Asset, { nullable: false, eager: true })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @ManyToOne(() => Employee, { nullable: false, eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date', name: 'assignment_date' })
  assignment_date: string;

  @Column({ type: 'date', name: 'return_date', nullable: true })
  return_date?: string;

  @Column({ type: 'text', name: 'assignment_reason', nullable: true })
  assignment_reason?: string;

  @Column({ type: 'text', name: 'return_reason', nullable: true })
  return_reason?: string;

  @Column({ name: 'condition_on_assignment', length: 100, nullable: true })
  condition_on_assignment?: string;

  @Column({ name: 'condition_on_return', length: 100, nullable: true })
  condition_on_return?: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_by_id' })
  assigned_by?: Employee;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'returned_by_id' })
  returned_by?: Employee;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ASSIGNED,
  })
  status: AssignmentStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}