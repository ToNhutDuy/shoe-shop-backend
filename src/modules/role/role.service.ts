import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }
  async isRoleExist(name: string): Promise<boolean> {
    const user = await this.roleRepository.findOne({ where: { name } });
    return !!user;
  }
  async create(createRoleDto: CreateRoleDto) {
    const { name, description } = createRoleDto;

    //Check role name
    const isExist = await this.isRoleExist(name);
    if (isExist) {
      throw new BadRequestException(`Tên quyền: ${name} đã tồn tại. Vui lòng chọn tên khác!!`);
    }

    //Create a role
    const role = await this.roleRepository.create({
      name, description
    })
    const savedRole = await this.roleRepository.save(role);
    return {
      _id: savedRole.id,
    }
  }

  findAll() {
    return `This action returns all role`;
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
