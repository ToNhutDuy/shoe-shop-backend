import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RolePermission, Roles } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto, AddPermissionToRoleDto } from './dto/roles.dto';
import { Resource } from './enums/resource.enum';
import { Action } from './enums/action.enum';
import { AllRoleRespone } from './dto/role-response.dto';

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

  private async findOrCreatePermission(resource: Resource, actions: Action[]): Promise<Permission> {
    const existingPermissions = await this.permissionsRepository.find({
      where: { resource: resource }
    });

    const foundPermission = existingPermissions.find(p =>
      p.action.length === actions.length && p.action.every(a => actions.includes(a))
    );

    if (foundPermission) {
      return foundPermission;
    }

    const newPermission = this.permissionsRepository.create({
      resource: resource,
      action: actions,
    });
    return await this.permissionsRepository.save(newPermission);
  }

  async createRole(dto: CreateRoleDto): Promise<Roles> {
    if (await this.roleExists(dto.name)) {
      throw new BadRequestException(`Role name "${dto.name}" đã tồn tại`);
    }

    const role = this.rolesRepository.create({ name: dto.name });
    await this.rolesRepository.save(role);

    const rolePermissionsToCreate: RolePermission[] = [];

    for (const permDto of dto.permissions) {
      const permissionEntity = await this.findOrCreatePermission(permDto.resource, permDto.action);

      const existingRolePermission = await this.rolePermissionsRepository.findOne({
        where: {
          role: { id: role.id },
          permission: { id: permissionEntity.id }
        }
      });

      if (existingRolePermission) {
        existingRolePermission.action = permDto.action;
        rolePermissionsToCreate.push(existingRolePermission);
      } else {
        const newRolePermission = this.rolePermissionsRepository.create({
          role: role,
          permission: permissionEntity,
          action: permDto.action,
        });
        rolePermissionsToCreate.push(newRolePermission);
      }
    }

    await this.rolePermissionsRepository.save(rolePermissionsToCreate);

    return this.getRoleById(role.id);
  }

  async getRoleById(id: number): Promise<any> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
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
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  async updateRole(id: number, dto: UpdateRoleDto): Promise<Roles> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Vai trò với ID ${id} không tồn tại`);
    }
    if (dto.name && dto.name !== role.name && await this.roleExists(dto.name)) {
      throw new BadRequestException(`Role name "${dto.name}" đã tồn tại`);
    }

    role.name = dto.name || role.name;
    await this.rolesRepository.save(role);
    return this.getRoleById(role.id);
  }

  async addPermissionToRole(roleId: number, dto: AddPermissionToRoleDto): Promise<Roles> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Vai trò với ID ${roleId} không tồn tại`);
    }

    const permissionEntity = await this.findOrCreatePermission(dto.resource, dto.action);

    const existingRolePermission = await this.rolePermissionsRepository.findOne({
      where: {
        role: { id: role.id },
        permission: { id: permissionEntity.id }
      }
    });

    if (existingRolePermission) {
      existingRolePermission.action = dto.action;
      await this.rolePermissionsRepository.save(existingRolePermission);
    } else {
      const newRolePermission = this.rolePermissionsRepository.create({
        role: role,
        permission: permissionEntity,
        action: dto.action,
      });
      await this.rolePermissionsRepository.save(newRolePermission);
    }

    return this.getRoleById(role.id);
  }

  async removePermissionFromRole(roleId: number, rolePermissionId: number): Promise<void> {
    const rolePermission = await this.rolePermissionsRepository.findOne({
      where: { id: rolePermissionId, role: { id: roleId } }
    });

    if (!rolePermission) {
      throw new NotFoundException(`Liên kết quyền (RolePermission ID: ${rolePermissionId}) cho vai trò ${roleId} không tồn tại.`);
    }

    await this.rolePermissionsRepository.remove(rolePermission);
  }

  async findAllRoles(query: { page?: number; limit?: number; search?: string }): Promise<any> {
    const { page = 1, limit = 10, search = '' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.rolesRepository.createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'permission');

    if (search) {
      queryBuilder.where('role.name ILIKE :search', { search: `%${search}%` });
    }

    const [roles, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      permissions: role.rolePermissions.map(rp => ({
        resource: rp.permission.resource,
        action: rp.action,
      })),
      created_at: role.created_at,
      updated_at: role.updated_at,
    }));

    return {
      data: formattedRoles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteRole(id: number): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Vai trò với ID ${id} không tồn tại`);
    }
    await this.rolesRepository.remove(role);
  }

  async getAllRoles(): Promise<AllRoleRespone[]> {
    try {
      const roles = await this.rolesRepository.find({
        order: {
          name: 'ASC',
        },
      });
      return roles;
    } catch (error) {
      throw new InternalServerErrorException('Không thể lấy tất cả danh sách vai trò.');
    }
  }
}