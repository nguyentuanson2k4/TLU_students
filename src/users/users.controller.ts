import { Controller, Get, Post, Patch, Body, UseGuards, Request, NotFoundException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/user.dto';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;

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

  @Patch('me/avatar')
  @Roles(Role.ADMIN, Role.STUDENT, Role.LECTURER)
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return callback(new BadRequestException('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload ảnh đại diện cho user đang đăng nhập' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh đại diện (jpg, jpeg, png, webp, tối đa 5MB)',
        },
      },
      required: ['avatar'],
    },
  })
  async uploadAvatar(@Request() req, @UploadedFile() file: UploadFile) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh.');
    }
    return this.usersService.updateAvatar(req.user.id, file);
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
