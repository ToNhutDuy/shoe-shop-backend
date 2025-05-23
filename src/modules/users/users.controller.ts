import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus, NotFoundException, HttpCode, Req, UseGuards, Put, ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { ApiResponse } from 'src/common/responses/api.response';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }



  // Quản lý Người dùng

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo người dùng thành công')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return ApiResponse.ok(user, 'Tạo người dùng thành công', HttpStatus.CREATED);
  }

  @Public() // Cho phép truy cập công khai
  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async findAll(
    @Query('query') query: string,
    @Query('current', ParseIntPipe) current: number,
    @Query('pageSize', ParseIntPipe) pageSize: number,
    @Query('sort') sort?: string,
  ) {
    const users = await this.usersService.findAll(query, current, pageSize, sort);
    return ApiResponse.ok(users, 'Lấy danh sách người dùng thành công');
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id}.`);
    }
    return ApiResponse.ok(user, `Lấy thông tin người dùng #${id} thành công`);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ResponseMessage('Cập nhật người dùng thành công')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id} để cập nhật.`);
    }
    return ApiResponse.ok(user, `Cập nhật người dùng #${id} thành công`);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Xóa người dùng thành công')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.usersService.remove(id);
    if (!result) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id} để xóa.`);
    }

  }

  // Quản lý Địa chỉ Giao hàng

  @Get('addresses')
  @ResponseMessage('Lấy danh sách địa chỉ thành công')
  @HttpCode(HttpStatus.OK)
  async getAddresses(@Req() req) {
    return this.usersService.getAddressesByUserId(req.user.userId);
  }

  @Post('addresses')
  @ResponseMessage('Thêm địa chỉ mới thành công')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Req() req, @Body() createAddressDto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.userId, createAddressDto);
  }

  @Get('addresses/:id')
  @ResponseMessage('Lấy chi tiết địa chỉ thành công')
  @HttpCode(HttpStatus.OK)
  async getAddress(@Req() req, @Param('id', ParseIntPipe) addressId: number) {
    return this.usersService.getAddressById(addressId, req.user.userId);
  }

  @Put('addresses/:id')
  @ResponseMessage('Cập nhật địa chỉ thành công')
  @HttpCode(HttpStatus.OK)
  async updateAddress(
    @Req() req,
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(addressId, req.user.userId, updateAddressDto);
  }

  @Delete('addresses/:id')
  @ResponseMessage('Xóa địa chỉ thành công')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Req() req, @Param('id', ParseIntPipe) addressId: number) {
    await this.usersService.deleteAddress(addressId, req.user.userId);

  }
}