import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../entities/Employee.entity';
import { Category } from '../assetmanagement/category.entity';
import { Asset } from '../assetmanagement/asset.entity';
import { Supplier } from './supplier.entity';

export enum RequestType {
  PURCHASE = 'PURCHASE',
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity({ name: 'request' })
export class Request {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Employee, { eager: true })
  @JoinColumn({ name: 'requester_id' })
  requester: Employee;

  @Column({ type: 'enum', enum: RequestType })
  request_type: RequestType;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ name: 'asset_name_suggest', length: 255, nullable: true })
  asset_name_suggest?: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;

  @Column({ name: 'image_url', length: 500, nullable: true })
  image_url?: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'date', name: 'request_date' })
  request_date: string;

  @Column({ type: 'date', name: 'needed_date', nullable: true })
  needed_date?: string;

  @Column({ type: 'enum', enum: RequestPriority, default: RequestPriority.MEDIUM })
  priority: RequestPriority;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: Employee;

  @Column({ type: 'date', name: 'approval_date', nullable: true })
  approval_date?: string;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejection_reason?: string;

  @Column({ type: 'text', name: 'approval_note', nullable: true })
  approval_note?: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimated_cost?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actual_cost?: string;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  start_date?: string;

  @Column({ type: 'date', name: 'completion_date', nullable: true })
  completion_date?: string;

  @Column({ type: 'text', name: 'result_note', nullable: true })
  result_note?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}