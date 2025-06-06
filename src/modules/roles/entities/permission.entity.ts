import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany } from 'typeorm';
import { RolePermission, Roles } from './role.entity';
import { Resource } from '../enums/resource.enum';
import { Action } from '../enums/action.enum';

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: Resource })
    resource: Resource;

    @Column({ type: 'simple-array' })
    action: Action[];

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
    rolePermissions: RolePermission[];
}

