import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable,
    Unique,
    OneToMany,
    ManyToOne,
} from 'typeorm';

import { Permission } from './permission.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('roles')
@Unique(['name'])
export class Roles {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, nullable: false })
    name: string;

    @OneToMany(() => User, (user) => user.role)
    users: User[];

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
    rolePermissions: RolePermission[];
}


@Entity('role_permissions')
export class RolePermission {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Roles, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
    role: Roles;

    @ManyToOne(() => Permission, (permission) => permission.rolePermissions, { onDelete: 'CASCADE' })
    permission: Permission;

    @Column('simple-array')
    action: string[];
}
