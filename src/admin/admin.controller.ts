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
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.LECTURER)
export class AdminController {
  constructor(private adminService: AdminService) {}

  
  @Get('users')
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getAllUsers(
    @Query('role') role?: Role,
    @Query('is_active') is_active?: string,
  ) {
    const filters: any = {};
    if (role) {
      filters.role = role;
    }
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
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
  async createUser(@Body() userData: any) {
    return this.adminService.createUser(userData);
  }

  
  @Put('users/:id')
  @ResponseMessage('Cập nhật thông tin người dùng thành công')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: any,
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
