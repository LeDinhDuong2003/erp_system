import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './Employee.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', nullable: true })
  employee_id!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  action!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_type!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource_id!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne(() => Employee, (employee) => employee.audit_logs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee | null;
}


