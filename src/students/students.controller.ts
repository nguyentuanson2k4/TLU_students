import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentProfileDto } from './dto/student.dto';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo sinh viên mới (Admin)' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Post('import/excel')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import danh sách sinh viên từ file Excel (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File Excel (.xlsx)' },
      },
    },
  })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Vui lòng upload file Excel.');
    }
    return this.studentsService.bulkCreateFromExcel(file.buffer);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách tất cả sinh viên (Admin, Lecturer)' })
  findAll() {
    return this.studentsService.findAll();
  }

  @Patch('profile/me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sinh viên tự cập nhật thông tin cá nhân' })
  updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateStudentProfileDto) {
    const userId = typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.studentsService.updateProfile(userId, updateProfileDto);
  }

  @Get(':code')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy thông tin sinh viên theo mã SV (Admin, Lecturer)' })
  findByCode(@Param('code') code: string) {
    return this.studentsService.findByCode(code);
  }

  @Patch(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin sinh viên theo mã SV (Admin)' })
  update(@Param('code') code: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(code, updateStudentDto);
  }

  @Delete(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa sinh viên theo mã SV (Admin)' })
  remove(@Param('code') code: string) {
    return this.studentsService.remove(code);
  }
}
