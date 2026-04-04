import { Controller, Get, Post, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(Role.ADMIN, Role.STUDENT, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy thông tin cá nhân của user đang đăng nhập' })
  async getMe(@Request() req) {
    const profile = await this.usersService.getProfile(req.user.id);
    if (!profile) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }
    return profile;
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo tài khoản Admin' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách tất cả tài khoản' })
  findAll() {
    return this.usersService.findAll();
  }
}
