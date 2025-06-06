import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RolePermission, Roles } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

import { CreateRoleDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Roles) private rolesRepository: Repository<Roles>,
    @InjectRepository(Permission) private permissionsRepository: Repository<Permission>,
    @InjectRepository(RolePermission) private rolePermissionsRepository: Repository<RolePermission>,
  ) { }

  private async roleExists(name: string): Promise<boolean> {
    const role = await this.rolesRepository.findOne({ where: { name } });
    return !!role;
  }

  async createRole(dto: CreateRoleDto) {
    if (await this.roleExists(dto.name)) {
      throw new BadRequestException(`Role name "${dto.name}" đã tồn tại`);
    }

    const role = this.rolesRepository.create({ name: dto.name });
    await this.rolesRepository.save(role);

    const resources = dto.permissions.map(p => p.resource);
    const existingPermissions = await this.permissionsRepository.find({
      where: { resource: In(resources) },
    });

    const rolePermissions: RolePermission[] = [];

    for (const p of dto.permissions) {
      let permission = existingPermissions.find(ep => ep.resource === p.resource);

      if (!permission) {
        permission = this.permissionsRepository.create({
          resource: p.resource,
          action: p.action,
        });
        await this.permissionsRepository.save(permission);
      }

      const rolePermission = this.rolePermissionsRepository.create({
        role,
        permission,
        action: p.action,
      });

      await this.rolePermissionsRepository.save(rolePermission);
      rolePermissions.push(rolePermission);
    }

    return {
      status: true,
      code: 200,
      data: {
        id: role.id,
        name: role.name,
        permissions: rolePermissions.map(rp => ({
          resource: rp.permission.resource,
          action: rp.action,
        })),
      },
      message: "Success",
    };
  }

  async getRoleById(id: number): Promise<any> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'], // load bảng trung gian và permission
    });

    if (!role) {
      throw new NotFoundException(`Vai trò với ID ${id} không tồn tại`);
    }

    return {
      id: role.id,
      name: role.name,
      permissions: role.rolePermissions.map(rp => ({
        resource: rp.permission.resource,
        action: rp.action,
      })),
    };
  }
}
