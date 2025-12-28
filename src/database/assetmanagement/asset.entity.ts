import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Supplier } from '../assetrequest/supplier.entity';

export enum AssetStatus {
  NEW = 'NEW',
  IN_USE = 'IN_USE',
  UNDER_REPAIR = 'UNDER_REPAIR',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  BROKEN = 'BROKEN',
  LIQUIDATED = 'LIQUIDATED',
}

@Entity({ name: 'asset' })
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'asset_code', length: 50, unique: true })
  asset_code: string;

  @Column({ name: 'asset_name', length: 255 })
  asset_name: string;

  @ManyToOne(() => Category, (category) => category.assets, { eager: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  price?: string;

  @Column({ type: 'date', name: 'purchase_date', nullable: true })
  purchase_date?: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.NEW,
  })
  status: AssetStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  image_url?: string;

  @Column({ name: 'current_holder_id', type: 'int', nullable: true })
  current_holder_id?: number;

  @Column({ name: 'current_assignment_date', type: 'date', nullable: true })
  current_assignment_date?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Supplier, { eager: false, nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;
}