import {
  Controller,
  Get,
  Post,
  Body,
  Put, // Use Put for full updates, Patch for partial
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';


import { CreateRoleDto } from './dto/roles.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Resource } from './enums/resource.enum';
import { Action } from './enums/action.enum';




@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions([{ resource: Resource.users, action: [Action.read, Action.create, Action.update, Action.delete] },
{ resource: Resource.roles, action: [Action.create, Action.delete, Action.read, Action.update] }])
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  async createRole(@Body() role: CreateRoleDto) {
    return await this.rolesService.createRole(role);
  }

  @Get(":id")
  async getPermission(@Param('id', ParseIntPipe) id: number) {

    return await this.rolesService.getRoleById(id)
  }
}