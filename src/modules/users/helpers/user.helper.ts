import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserHelper {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>
    ) { }

    async checkEmailExist(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            throw new BadRequestException(`Email ${email} đã tồn tại`);
        }
    }
    async checkEmailNotExist(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new BadRequestException(`Email ${email} chưa tồn tại`);
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
