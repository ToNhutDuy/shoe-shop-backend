import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Like, Repository } from 'typeorm';
import { hashPasswordUtil } from '../common/helpers/util';
import { UserHelper } from './helpers/user.helper';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userHelper: UserHelper
  ) { }



  async create(createUserDto: CreateUserDto) {
    const { fullName, email, passwordHash, phoneNumber } = createUserDto;
    const roleId = createUserDto.role ?? 2;
    //Check email
    await this.userHelper.checkEmailExist(email);

    //Check role

    await this.userHelper.checkRoleExist(roleId);

    //Hash password
    const hashPassword = await hashPasswordUtil(passwordHash);

    //Create a user
    const user = await this.userRepository.create({
      fullName, email, passwordHash: hashPassword, phoneNumber, role: { id: roleId }
    })
    const savedUser = await this.userRepository.save(user);


    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });

  }

  async findAll(
    query: string,
    current: number,
    pageSize: number,
    sort?: string // thêm sort từ query param
  ) {
    current = current ?? 1;
    pageSize = pageSize ?? 10;

    current = Math.max(1, current);
    pageSize = Math.max(1, Math.min(pageSize, 100));

    if (typeof query !== 'string') {
      query = '';
    }

    if (query.length > 100) {
      throw new BadRequestException('Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)');
    }

    const where = query ? { fullName: Like(`%${query}%`) } : {};

    // Xử lý sort
    let order: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' }; // mặc định sắp xếp theo id
    if (sort) {
      const [field, direction] = sort.split(':');
      const dir = direction?.toUpperCase();
      if (['ASC', 'DESC'].includes(dir)) {
        order = { [field]: dir as 'ASC' | 'DESC' };
      }
    }

    const [data, total] = await this.userRepository.findAndCount({
      where,
      order,
      skip: (current - 1) * pageSize,
      take: pageSize,
      relations: ['role'],
    });


    const dataWithoutPassword = data.map(user =>
      plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })
    );
    return {
      data: dataWithoutPassword,
      pagination: {
        current,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    } satisfies PaginationDto<UserResponseDto>;
  }

  async findOne(_id: number) {

    const user = await this.userHelper.checkUserExist(_id);
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }
  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Kiểm tra user có tồn tại không
    const user = await this.userHelper.checkUserExist(id);

    const { fullName, phoneNumber } = updateUserDto;
    const updateData: Partial<User> = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    await this.userRepository.update({ id }, updateData);
    const updatedUser = await this.userRepository.findOne({ where: { id }, relations: ['role'] });

    return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }


  async remove(_id: number) {
    // Kiểm tra user tồn tại
    await this.userHelper.checkUserExist(_id);
    await this.userRepository.delete(_id);
    return { message: 'Xóa user thành công' };
  }
}
