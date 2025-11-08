import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from './Role.entity';
import { Permission } from './Permission.entity';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn({ type: 'int' })
  role_id!: number;

  @PrimaryColumn({ type: 'int' })
  permission_id!: number;

  @ManyToOne(() => Role, (role) => role.role_permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Permission, (permission) => permission.role_permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;
}


