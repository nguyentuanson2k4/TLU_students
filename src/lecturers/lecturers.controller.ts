import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { LecturersService } from './lecturers.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateLecturerDto,
  UpdateLecturerDto,
  UpdateLecturerProfileDto,
} from './dto/lecturer.dto';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;

@ApiTags('Lecturers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lecturers')
export class LecturersController {
  constructor(private readonly lecturersService: LecturersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo giảng viên mới (Admin)' })
  create(@Body() createLecturerDto: CreateLecturerDto) {
    return this.lecturersService.create(createLecturerDto);
  }

  @Post('import/excel')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import danh sách giảng viên từ file Excel (Admin)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx)',
        },
      },
    },
  })
  async importExcel(@UploadedFile() file: UploadFile) {
    if (!file) {
      throw new Error('Vui lòng upload file Excel.');
    }
    return this.lecturersService.bulkCreateFromExcel(file.buffer);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tất cả giảng viên (Admin)' })
  findAll() {
    return this.lecturersService.findAll();
  }

  @Patch('profile/me')
  @Roles(Role.LECTURER)
  @ApiOperation({ summary: 'Giảng viên tự cập nhật thông tin cá nhân' })
  updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateLecturerProfileDto,
  ) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.lecturersService.updateProfile(userId, updateProfileDto);
  }

  @Get('my-classes')
  @Roles(Role.LECTURER)
  @ApiOperation({
    summary: 'Lấy danh sách các lớp học phần được phân công dạy (Lecturer)',
  })
  async getMyClasses(@Req() req: any) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.lecturersService.getMyClasses(userId);
  }

  @Get(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy thông tin giảng viên theo mã GV (Admin)' })
  findByCode(@Param('code') code: string) {
    return this.lecturersService.findByCode(code);
  }

  @Patch(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin giảng viên theo mã GV (Admin)' })
  update(
    @Param('code') code: string,
    @Body() updateLecturerDto: UpdateLecturerDto,
  ) {
    return this.lecturersService.update(code, updateLecturerDto);
  }

  @Delete(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa giảng viên theo mã GV (Admin)' })
  remove(@Param('code') code: string) {
    return this.lecturersService.remove(code);
  }
}
