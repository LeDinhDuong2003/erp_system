import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'supplier' })
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_code', length: 50, unique: true })
  supplier_code: string;

  @Column({ name: 'supplier_name', length: 255 })
  supplier_name: string;

  @Column({ name: 'service_type', length: 100, nullable: true })
  service_type?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ name: 'contact_person', length: 100, nullable: true })
  contact_person?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.ACTIVE })
  status: SupplierStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}