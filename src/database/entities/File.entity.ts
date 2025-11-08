import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Employee } from './Employee.entity';

export enum FileCategory {
  RESUME = 'RESUME',
  ID_PROOF = 'ID_PROOF',
  CERTIFICATE = 'CERTIFICATE',
  CONTRACT = 'CONTRACT',
  PAYSLIP = 'PAYSLIP',
  OTHER = 'OTHER',
}

@Entity({ name: 'files' })
export class File {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  employee_id!: number | null;

  @Column({ type: 'varchar', length: 255 })
  file_name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  file_type!: string | null;

  @Column({ type: 'text' })
  file_url!: string;

  @Column({ type: 'enum', enum: FileCategory, nullable: true })
  category!: FileCategory | null;

  @Column({ type: 'int', nullable: true })
  uploaded_by!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  uploaded_at!: Date | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'uploaded_by' })
  uploader!: Employee | null;
}

