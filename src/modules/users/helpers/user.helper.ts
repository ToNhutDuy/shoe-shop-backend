import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Roles } from '../../roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserHelper {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Roles)
        private readonly roleRepository: Repository<Roles>
    ) { }

    async checkEmailExist(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            throw new BadRequestException(`Tài khoản ${email} đã tồn tại`);
        }
    }
    async checkEmailExistOrThrow(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new BadRequestException(`Tài khoản ${email} chưa tồn tại`);
        }
        return user;
    }
    async checkRoleExist(roleId: number) {
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new BadRequestException(`Role với id = ${roleId} không tồn tại`);
        }
    }

    async checkUserExist(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User với id = ${id} không tồn tại`);
        }
        return user;
    }
}
