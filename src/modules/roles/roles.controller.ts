import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Query,
  UsePipes,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AddPermissionToRoleDto,
} from './dto/roles.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from './enums/resource.enum';
import { Action } from './enums/action.enum';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { Roles } from './entities/role.entity';
import { AddPermissionToRoleSchema, CreateRoleSchema, UpdateRoleSchema } from './dto/schemas/roles.schema';
import { AllRoleRespone } from './dto/role-response.dto';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }




  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateRoleSchema))
  @Permissions([{ resource: Resource.roles, action: [Action.create] }])
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<Roles> {

    return this.rolesService.createRole(createRoleDto);
  }


  @Get('all')
  @HttpCode(HttpStatus.OK)
  @Permissions([{ resource: Resource.roles, action: [Action.read] }])
  async getAllRoles() {
    return this.rolesService.getAllRoles();
  }


  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  @Permissions([{ resource: Resource.roles, action: [Action.read] }])
  async findAllRoles(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Roles>> {

    return this.rolesService.findAllRoles(query);
  }




  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions([{ resource: Resource.roles, action: [Action.read] }])
  async getRoleById(@Param('id', ParseIntPipe) id: number): Promise<Roles> {

    return this.rolesService.getRoleById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(UpdateRoleSchema))
  @Permissions([{ resource: Resource.roles, action: [Action.update] }])
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto): Promise<Roles> {

    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Post(':roleId/permissions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(AddPermissionToRoleSchema))
  @Permissions([{ resource: Resource.roles, action: [Action.update] }])
  async addPermissionToRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() addPermissionDto: AddPermissionToRoleDto,
  ): Promise<Roles> {

    return this.rolesService.addPermissionToRole(roleId, addPermissionDto);
  }

  @Delete(':roleId/permissions/:rolePermissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([{ resource: Resource.roles, action: [Action.update] }])
  async removePermissionFromRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('rolePermissionId', ParseIntPipe) rolePermissionId: number,
  ): Promise<void> {

    await this.rolesService.removePermissionFromRole(roleId, rolePermissionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions([{ resource: Resource.roles, action: [Action.delete] }])
  async deleteRole(@Param('id', ParseIntPipe) id: number): Promise<void> {

    await this.rolesService.deleteRole(id);
  }
}