import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EmployeeRoleAssignment } from './EmployeeRoleAssignment.entity';
import { RolePermission } from './RolePermission.entity';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @OneToMany(() => EmployeeRoleAssignment, (era) => era.role)
  employee_role_assignments!: EmployeeRoleAssignment[];

  @OneToMany(() => RolePermission, (rp) => rp.role)
  role_permissions!: RolePermission[];
}


