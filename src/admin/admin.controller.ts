import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreateUserDto } from '../users/dto/user.dto';
import { UpdateUserDto, UserFilterDto } from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.LECTURER)
export class AdminController {
  constructor(private adminService: AdminService) {}

  
  @Get('users')
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getAllUsers(@Query() filterDto: UserFilterDto) {
    const filters: any = {};
    if (filterDto.role) {
      filters.role = filterDto.role;
    }
    if (filterDto.is_active !== undefined) {
      filters.is_active = filterDto.is_active === 'true';
    }

    return this.adminService.getAllUsers(filters);
  }

  
  @Get('users/:id')
  @ResponseMessage('Lấy thông tin chi tiết người dùng thành công')
  async getUserDetail(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }


  @Post('users')
  @ResponseMessage('Tạo người dùng mới thành công')
  async createUser(@Body() userData: CreateUserDto) {
    return this.adminService.createUser(userData);
  }

  
  @Put('users/:id')
  @ResponseMessage('Cập nhật thông tin người dùng thành công')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, updateData);
  }

  
  @Patch('users/:id/deactivate')
  @ResponseMessage('Khóa tài khoản người dùng thành công')
  async deactivateUser(@Param('id') userId: string) {
    return this.adminService.deactivateUser(userId);
  }

  
  @Patch('users/:id/activate')
  @ResponseMessage('Mở khóa tài khoản người dùng thành công')
  async activateUser(@Param('id') userId: string) {
    return this.adminService.activateUser(userId);
  }

  
  @Delete('users/:id')
  @ResponseMessage('Xóa người dùng thành công')
  async deleteUser(@Param('id') userId: string) {
    await this.adminService.deleteUser(userId);
    return null;
  }
}
