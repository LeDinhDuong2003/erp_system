import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from './Role.entity';
import { Permission } from './Permission.entity';

@Entity({ name: 'role_permissions' })
export class RolePermission {
  @PrimaryColumn({ type: 'bigint' })
  role_id!: string;

  @PrimaryColumn({ type: 'bigint' })
  permission_id!: string;

  @ManyToOne(() => Role, (role) => role.role_permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Permission, (permission) => permission.role_permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;
}


