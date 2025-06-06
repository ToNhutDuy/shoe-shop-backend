import {
  BadRequestException, Injectable, InternalServerErrorException,
  NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus, AccountType } from './entities/user.entity';
import { FindOptionsOrder, FindOptionsWhere, Like, Repository, Not } from 'typeorm';
import { UserHelper } from './helpers/user.helper';
import { UsersResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

import { Address } from './entities/address.entity';
import { hashBcryptUtil } from 'src/common/helpers/util';
import { CreateUserZodDto, UpdateUserZodDto } from './dto/user-zod.dto';
import { ChangePasswordZodDto, CheckCodeZodDto, ForgotPasswordZodDto, RegisterZodDto } from '../auth/dto/auth-zod.dto';
import { CreateAddressZodDto, UpdateAddressZodDto } from './dto/address-zod.dto';
import { Roles } from '../roles/entities/role.entity';
import { EmailVerificationCode } from './entities/email-verification-code.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { IUser } from './interfaces/user.interface';
import { RolesService } from '../roles/roles.service';
import { AddressResponseDto } from './dto/address-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(EmailVerificationCode)
    private readonly emailVerificationCodeRepository: Repository<EmailVerificationCode>,
    @InjectRepository(PasswordResetCode)
    private readonly passwordResetCodeRepository: Repository<PasswordResetCode>,
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    private readonly userHelper: UserHelper,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,
    private readonly rolesService: RolesService,
  ) { }

  // Quản lý Người dùng
  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async create(dataUser: CreateUserZodDto): Promise<UsersResponseDto> { // Return DTO
    const { fullName, email, password, phoneNumber, role } = dataUser;


    const roleId = role ?? 1;

    await this.userHelper.checkEmailExist(email);
    await this.userHelper.checkRoleExist(roleId);

    const hashedPassword = await hashBcryptUtil(password);

    const newUserEntity = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: { id: roleId },
      accountType: AccountType.LOCAL,
      status: UserStatus.INACTIVE,
    });

    try {
      const savedUser = await this.usersRepository.save(newUserEntity);

      return plainToInstance(UsersResponseDto, savedUser, { excludeExtraneousValues: true });
    } catch (error) {
      this.logger.error(`Error creating user: ${email}`, error.stack);

      if (error.code === '23505') {
        throw new ConflictException('Email hoặc thông tin khác đã tồn tại.');
      }
      throw new InternalServerErrorException('Không thể tạo người dùng. Vui lòng thử lại sau.');
    }
  }
  async getUserPermissions(userId: number) {
    const user = await this.userHelper.checkUserExist(userId);

    const role = await this.rolesService.getRoleById(user.role_id);

    return {
      ...role,
      permissions: role.permissions || [],
    };
  }
  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async createWithGoogle(profile: any): Promise<User> { // Trả về User entity
    const email = profile.emails?.[0]?.value;
    if (!email) {
      this.logger.error('Google profile missing email', profile);
      throw new BadRequestException('Không thể lấy email từ hồ sơ Google.');
    }

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      if (existingUser.accountType === AccountType.LOCAL) {
        throw new ConflictException('Email này đã được đăng ký bằng tài khoản thường. Vui lòng đăng nhập bằng tài khoản cục bộ của bạn.');
      }
      if (existingUser.accountType === AccountType.GOOGLE && existingUser.googleId !== profile.id) {
        throw new ConflictException('Email đã được liên kết với một tài khoản Google khác.');
      }

      return existingUser;
    }

    const newUser = this.usersRepository.create({
      password: null, // No local password for Google accounts
      email: email,
      fullName: profile.displayName || email, // Fallback to email if displayName is not present
      accountType: AccountType.GOOGLE,
      googleId: profile.id,
      status: UserStatus.ACTIVE, // Google users are typically active immediately
      emailVerifiedAt: new Date(), // Email is considered verified by Google
      role: { id: 1 }, // Default role, ensure role ID 1 exists
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      this.logger.error(`Error creating Google user for email: ${email}`, error.stack);
      if (error.code === '23505') {
        throw new ConflictException('Lỗi khi tạo tài khoản Google, thông tin có thể đã tồn tại.');
      }
      throw new InternalServerErrorException('Không thể tạo người dùng Google. Vui lòng thử lại sau.');
    }
  }

  async findAll(
    queryInput?: string,
    currentInput?: number,
    pageSizeInput?: number,
    sortInput?: string,
  ): Promise<PaginatedResponse<UsersResponseDto>> {
    const current = Math.max(1, currentInput ?? 1);
    const pageSize = Math.max(1, Math.min(pageSizeInput ?? 10, 100)); // Max 100 per page
    const query = (typeof queryInput === 'string' && queryInput.length <= 100) ? queryInput : '';


    const where: FindOptionsWhere<IUser> | FindOptionsWhere<IUser>[] = query
      ? { fullName: Like(`%${query}%`) }
      : {};

    let order: FindOptionsOrder<IUser> = { id: 'DESC' }; // Default sort
    if (sortInput) {
      const [field, direction] = sortInput.split(':');
      const upperDirection = direction?.toUpperCase();
      const allowedSortFields = ['id', 'email', 'fullName', 'createdAt', 'updatedAt', 'status'];
      if (['ASC', 'DESC'].includes(upperDirection) && allowedSortFields.includes(field)) {
        order = { [field]: upperDirection as 'ASC' | 'DESC' };
      } else {
        this.logger.warn(`Invalid sort parameter: ${sortInput}. Ignoring and using default sort.`);
      }
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      order,
      skip: (current - 1) * pageSize,
      take: pageSize,
      relations: ['role'],
    });

    const dataDto = data.map(user =>
      plainToInstance(UsersResponseDto, user, { excludeExtraneousValues: true }),
    );

    return {
      data: dataDto,
      meta: {
        currentPage: current,
        itemCount: data.length,
        itemsPerPage: pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOneById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id },

    });
    return user; // TRẢ VỀ TRỰC TIẾP ENTITY
  }


  async findOne(id: number): Promise<UsersResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profilePictureMedia']
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id}.`);
    }
    return plainToInstance(UsersResponseDto, user, { excludeExtraneousValues: true });
  }



  async update(id: number, updateUserData: UpdateUserZodDto): Promise<UsersResponseDto> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id} để cập nhật.`);
    }


    Object.assign(user, updateUserData);

    if (updateUserData.status !== undefined && updateUserData.status !== null) {
      user.status = updateUserData.status;
    }
    if (updateUserData.email !== undefined) {
      const existingUser = await this.usersRepository.findOneBy({ email: updateUserData.email });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email đã được sử dụng bởi người dùng khác.');
      }
      user.email = updateUserData.email;
    }
    if (updateUserData.role !== undefined) { // Giả sử DTO của bạn dùng roleId thay vì role
      const roleId = updateUserData.role; // Giả sử role là ID của role
      const roleEntity = await this.rolesRepository.findOneBy({ id: roleId });
      if (!roleEntity) {
        throw new BadRequestException(`Role với ID #${roleId} không tồn tại.`);
      }
      user.role = roleEntity;
    }


    try {
      const updatedUser = await this.usersRepository.save(user);
      return plainToInstance(UsersResponseDto, updatedUser, { excludeExtraneousValues: true });
    } catch (error) {
      this.logger.error(`Lỗi update người dùng ID ${id}`, error.stack);
      throw new InternalServerErrorException('Không thể cập nhật người dùng.');
    }
  }

  async remove(userId: number): Promise<void> { // Changed return type to void
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${userId} để xóa.`);
    }

    // Transaction might be good here if these deletions are critical to happen together
    await this.emailVerificationCodeRepository.delete({ user: { id: userId } });
    await this.passwordResetCodeRepository.delete({ user: { id: userId } });
    await this.addressesRepository.delete({ user: { id: userId } });

    const deleteResult = await this.usersRepository.delete(userId);
    if (deleteResult.affected === 0) {

      throw new InternalServerErrorException(`Không thể xóa người dùng ID #${userId} mặc dù đã tìm thấy trước đó.`);
    }
    this.logger.log(`User ID #${userId} và dữ liệu liên quan đã được xóa thành công.`);
  }

  // Quản lý Token và Email (createOrUpdateEmailVerificationToken, createPasswordResetToken, sendEmail are good)


  private async sendEmail(user: User, code: string, subject: string, template: string, expiresInMinutes: number): Promise<void> {
    try {
      const clientUrl = this.configService.get<string>('CLIENT_URL');
      if (!clientUrl) {
        this.logger.error('CLIENT_URL is not configured for email templates.');
        throw new InternalServerErrorException('Lỗi cấu hình hệ thống email (CLIENT_URL).');
      }
      await this.mailerService.sendMail({
        to: user.email,
        subject: subject,
        template: template,
        context: {
          name: user.fullName || user.email,
          activationCode: code,
          //clientUrl: clientUrl,
          expiresInMinutes: expiresInMinutes, // Thời gian hết hạn mã xác thực
        },
      });
      this.logger.log(`Email "${subject}" sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Lỗi gửi email đến ${user.email} với chủ đề "${subject}"`, err.stack);
      throw new InternalServerErrorException('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  async createOrUpdateEmailVerificationCode(user: User, expiryMinutes: number, code: string): Promise<EmailVerificationCode> {
    let existingCode = await this.emailVerificationCodeRepository.findOne({ where: { user: { id: user.id } } });

    const expiresAt = dayjs().add(expiryMinutes, 'minutes').toDate();

    if (existingCode) {
      existingCode.code = code;
      existingCode.expiresAt = expiresAt;
      this.logger.debug(`Updating email verification token for user ${user.id}`);
      return this.emailVerificationCodeRepository.save(existingCode);
    } else {
      const newCode = this.emailVerificationCodeRepository.create({
        user: user,
        code: code,
        expiresAt: expiresAt,
      });
      this.logger.debug(`Creating new email verification token for user ${user.id}`);
      return this.emailVerificationCodeRepository.save(newCode);
    }
  }

  async createPasswordResetCode(user: User, expiryMinutes: number, code: string): Promise<PasswordResetCode> {

    const expiresAt = dayjs().add(expiryMinutes, 'minutes').toDate();

    let existingCode = await this.passwordResetCodeRepository.findOne({ where: { user: { id: user.id } } });

    if (existingCode) {
      existingCode.code = code;
      existingCode.expiresAt = expiresAt;
      this.logger.debug(`Updating password reset token for user ${user.id}`);
      return this.passwordResetCodeRepository.save(existingCode);
    } else {
      const newCode = this.passwordResetCodeRepository.create({
        user: user,
        code: code,
        expiresAt: expiresAt,
      });
      this.logger.debug(`Creating new password reset token for user ${user.id}`);
      return this.passwordResetCodeRepository.save(newCode);
    }
  }


  // Logic Xác thực Người dùng (handleRegister, handleActive, retryActive, forgotPassword, changePassword)
  async handleRegister(registerDto: RegisterZodDto): Promise<UsersResponseDto> { // Use the correct DTO
    const { fullName, email, password, confirmPassword } = registerDto; // Zod should ensure confirmPassword exists if needed

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      if (existingUser.accountType === AccountType.GOOGLE) {
        throw new ConflictException('Email này đã được đăng ký bằng tài khoản Google. Vui lòng đăng nhập bằng Google.');
      }
      throw new ConflictException('Email này đã được đăng ký.');
    }

    if (password !== confirmPassword) { // Zod can also create a refined schema for this check
      throw new BadRequestException('Xác nhận mật khẩu không chính xác.');
    }
    // Password length should be validated by Zod: createUserSchema

    const hashedPassword = await hashBcryptUtil(password);

    const newUserEntity = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      // phoneNumber: registerDto.phoneNumber, // Add if it's part of CreateUserZodDto for registration
      role: { id: 1 }, // Default role
      status: UserStatus.INACTIVE,
      accountType: AccountType.LOCAL,
    });

    const savedUser = await this.usersRepository.save(newUserEntity);

    const code = uuidv4().slice(0, 6);
    const codeExpiryMinutes = parseInt(this.configService.get<string>('EMAIL_CODE_EXPIRES_IN_MINUTES', '15'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid EMAIL_CODE_EXPIRES_IN_MINUTES, using default 15.`);
      // Assign a safe default if parsing failed.
    }

    await this.createOrUpdateEmailVerificationCode(savedUser, codeExpiryMinutes, code);
    await this.sendEmail(savedUser, code, 'Kích hoạt tài khoản của bạn tại Shoe-shop', 'register', codeExpiryMinutes);

    return plainToInstance(UsersResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async handleActive(checkCodeData: CheckCodeZodDto): Promise<UsersResponseDto> {
    const { email, code, } = checkCodeData;
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['emailVerificationCode'],
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt trước đó.');
    }

    if (!user.emailVerificationCode) {
      throw new BadRequestException('Không tìm thấy mã xác thực cho tài khoản này.');
    }

    if (user.emailVerificationCode.code !== code) {
      throw new BadRequestException('Mã xác thực không chính xác.');
    }

    if (dayjs().isAfter(dayjs(user.emailVerificationCode.expiresAt))) {
      throw new BadRequestException('Mã xác thực đã hết hạn, vui lòng yêu cầu gửi lại.');
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    await this.emailVerificationCodeRepository.delete({ id: user.emailVerificationCode.id }); // Delete the token
    const updatedUser = await this.usersRepository.save(user);

    return plainToInstance(UsersResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  async retryActive(email: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt. Không cần gửi lại mã.');
    }
    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản Google không yêu cầu kích hoạt email.');
    }

    const code = uuidv4().slice(0, 6);
    const codeExpiryMinutes = parseInt(this.configService.get<string>('EMAIL_CODE_EXPIRES_IN_MINUTES', '15'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid EMAIL_CODE_EXPIRES_IN_MINUTES, using default 15.`);
    }

    await this.createOrUpdateEmailVerificationCode(user, codeExpiryMinutes, code);
    await this.sendEmail(user, code, 'Yêu cầu mã kích hoạt tài khoản của bạn tại Shoe-shop', 'activation', codeExpiryMinutes);
  }

  async forgotPassword(data: ForgotPasswordZodDto): Promise<void> {
    const user = await this.userHelper.checkEmailExistOrThrow(data.email);
    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản này được đăng ký bằng Google. Vui lòng sử dụng quy trình khôi phục mật khẩu của Google.');
    }

    const codeExpiryMinutes = parseInt(this.configService.get<string>('PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES', '30'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES, using default 30.`);
    }
    const code = uuidv4().slice(0, 6);
    await this.createPasswordResetCode(user, codeExpiryMinutes, code);
    await this.sendEmail(user, code, 'Yêu cầu đặt lại mật khẩu của bạn', 'forgot-password', codeExpiryMinutes);
  }

  async changePassword(changePasswordData: ChangePasswordZodDto): Promise<void> {
    const { email, code, password, confirmPassword } = changePasswordData; // Đổi 'password' thành 'newPassword' để rõ ràng hơn

    this.logger.log(`Attempting to change password for email: ${email}`);

    // 1. Xác nhận mật khẩu mới và xác nhận mật khẩu
    if (password !== confirmPassword) {
      this.logger.warn(`Password change failed for ${email}: New password and confirmation do not match.`);
      throw new BadRequestException('Xác nhận mật khẩu mới không chính xác.');
    }

    // 2. Tìm người dùng và token đặt lại mật khẩu
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['passwordResetCodes'], // Đảm bảo quan hệ này được tải
    });

    if (!user) {
      this.logger.warn(`Password change failed for non-existent user: ${email}`);
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    // 3. Kiểm tra loại tài khoản (chỉ cho phép thay đổi mật khẩu tài khoản cục bộ)
    if (user.accountType === AccountType.GOOGLE) {
      this.logger.warn(`Password change attempted for Google account: ${email}`);
      throw new BadRequestException('Không thể thay đổi mật khẩu cho tài khoản Google. Vui lòng sử dụng quy trình khôi phục mật khẩu của Google.');
    }


    if (!user.passwordResetCodes) {
      this.logger.warn(`Password change failed for ${email}: No password reset token found.`);
      throw new BadRequestException('Không tìm thấy yêu cầu đặt lại mật khẩu. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    }


    if (user.passwordResetCodes.code !== code) {
      this.logger.warn(`Password change failed for ${email}: Invalid reset token provided.`);

      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id });
      throw new BadRequestException('Mã đặt lại mật khẩu không chính xác hoặc đã bị sử dụng.');
    }

    if (dayjs().isAfter(dayjs(user.passwordResetCodes.expiresAt))) {
      this.logger.warn(`Password change failed for ${email}: Expired reset code.`);

      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id });
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu gửi lại.');
    }

    // 7. Hash mật khẩu mới và cập nhật
    try {
      user.password = await hashBcryptUtil(password); // Sử dụng 'newPassword'
      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id }); // Invalidate token sau khi sử dụng
      await this.usersRepository.save(user);
      this.logger.log(`Password successfully changed for user: ${email}`);
    } catch (error) {
      this.logger.error(`Error saving new password for user ${email}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Không thể thay đổi mật khẩu. Vui lòng thử lại sau.');
    }
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`Attempt to update refresh token for non-existent user ID: ${userId}`);
      throw new NotFoundException('Người dùng không tồn tại.');
    }
    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);
    this.logger.debug(`Refresh token updated for user ID: ${userId}`);
  }

  // Quản lý Địa chỉ
  async createAddress(userId: number, createAddressData: CreateAddressZodDto): Promise<Address> {
    const user = await this.userHelper.checkUserExist(userId);

    if (createAddressData.isDefault) {
      // Set all other addresses of this user to not be default
      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true }, // Condition: addresses of this user that are currently default
        { isDefault: false },                       // Action: set them to not default
      );
      // The condition `country: 'Vietnam'` was removed unless it's a specific business rule.
    }

    const newAddress = this.addressesRepository.create({
      ...createAddressData,
      user, // Link to the user entity
    });

    try {
      return await this.addressesRepository.save(newAddress);
    } catch (error) {
      this.logger.error(`Error creating address for user ID ${userId}`, error.stack);
      throw new InternalServerErrorException('Không thể tạo địa chỉ mới.');
    }
  }

  async getAddressesByUserId(userId: number): Promise<Address[]> {
    await this.userHelper.checkUserExist(userId); // Good to check if user exists first
    return this.addressesRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // getDefaultAddressByUserId seems fine.

  async getAddressById(addressId: number, userId: number): Promise<Address> { // Return Address, not Address | null
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user: { id: userId } },
    });
    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID ${addressId} thuộc về người dùng này.`);
    }
    return address;
  }
  async findAllAddress(
    queryInput?: string,
    currentInput?: number,
    pageSizeInput?: number,
    sortInput?: string,
  ): Promise<PaginatedResponse<AddressResponseDto>> {
    const query = (typeof queryInput === 'string' && queryInput.length <= 100) ? queryInput : '';
    this.logger.log('findAllAddress called');

    const where: FindOptionsWhere<Address> | FindOptionsWhere<Address>[] = query
      ? {
        streetAddress: Like(`%${query}%`),

      }
      : {};

    let order: FindOptionsOrder<Address> = { id: 'DESC' };
    if (sortInput) {
      const [field, direction] = sortInput.split(':');
      const upperDirection = direction?.toUpperCase();
      const allowedSortFields = ['id', 'recipientFullName', 'streetAddress', 'ward', 'district', 'cityProvince', 'createdAt', 'updatedAt', 'isDefault'];
      if (['ASC', 'DESC'].includes(upperDirection) && allowedSortFields.includes(field)) {
        order = { [field]: upperDirection as 'ASC' | 'DESC' };
      } else {
        this.logger.warn(`Invalid sort parameter: ${sortInput}. Ignoring and using default sort.`);
      }
    }

    const takeAll = !pageSizeInput || pageSizeInput === 0;

    let data: Address[];
    let total: number;

    if (takeAll) {
      data = await this.addressesRepository.find({
        where,
        order,
        relations: ['user'],
      });
      total = data.length;
    } else {
      const current = Math.max(1, currentInput ?? 1);
      const pageSize = Math.max(1, Math.min(pageSizeInput ?? 10, 100));

      [data, total] = await this.addressesRepository.findAndCount({
        where,
        order,
        skip: (current - 1) * pageSize,
        take: pageSize,
        relations: ['user'],
      });
    }
    this.logger.log('findAllAddress completed');

    const dataDto = data.map(address =>
      plainToInstance(AddressResponseDto, address, { excludeExtraneousValues: true }),
    );

    return {
      data: dataDto,
      meta: {
        currentPage: takeAll ? 1 : currentInput ?? 1,
        itemCount: dataDto.length,
        itemsPerPage: takeAll ? dataDto.length : pageSizeInput ?? 10,
        totalItems: total,
        totalPages: takeAll ? 1 : Math.ceil(total / (pageSizeInput ?? 10)),
      },
    };
  }
  async updateAddress(addressId: number, userId: number, updateAddressData: UpdateAddressZodDto): Promise<Address> {

    const address = await this.getAddressById(addressId, userId);

    if (updateAddressData.isDefault && !address.isDefault) {

      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true, id: Not(addressId) },
        { isDefault: false },
      );
    }


    Object.assign(address, updateAddressData);

    try {
      return await this.addressesRepository.save(address);
    } catch (error) {
      this.logger.error(`Error updating address ID ${addressId} for user ID ${userId}`, error.stack);
      throw new InternalServerErrorException('Không thể cập nhật địa chỉ.');
    }
  }

  async deleteAddress(addressId: number, userId: number): Promise<void> { // Return void
    const deleteResult = await this.addressesRepository.delete({
      id: addressId,
      user: { id: userId }, // Ensures user owns the address
    });
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID ${addressId} của bạn để xóa.`);
    }
    this.logger.log(`Address ID #${addressId} for user ID #${userId} deleted successfully.`);
  }
}