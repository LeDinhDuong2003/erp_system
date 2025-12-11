import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EmployeePosition } from './EmployeePosition.entity';
import { Department } from './Department.entity';

@Entity({ name: 'positions' })
export class Position {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'smallint', nullable: true })
  level!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', nullable: true })
  department_id!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @OneToMany(() => EmployeePosition, (ep) => ep.position)
  employee_positions!: EmployeePosition[];
}

