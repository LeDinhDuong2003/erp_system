import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EmployeePosition } from './EmployeePosition.entity';

@Entity({ name: 'departments' })
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'int', nullable: true })
  parent_id!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Department, (dept) => dept.children)
  @JoinColumn({ name: 'parent_id' })
  parent!: Department | null;

  @OneToMany(() => Department, (dept) => dept.parent)
  children!: Department[];

  @OneToMany(() => EmployeePosition, (ep) => ep.department)
  employee_positions!: EmployeePosition[];
}

