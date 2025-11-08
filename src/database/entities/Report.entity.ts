import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Employee } from './Employee.entity';

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  file_url!: string | null;

  @Column({ type: 'int', nullable: true })
  generated_by!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  params!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'generated_by' })
  generator!: Employee | null;
}

