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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { StudentsService } from './students.service';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentProfileDto,
  BulkDeleteStudentsDto,
} from './dto/student.dto';

// Type for file upload - using any due to Express.Multer.File type compatibility
type UploadFile = any;

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
  updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateStudentProfileDto,
  ) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.studentsService.updateProfile(userId, updateProfileDto);
  }

  @Get('me/schedule')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sinh viên xem thời khóa biểu của mình' })
  @ApiQuery({
    name: 'semester_id',
    required: false,
    type: String,
    description: 'ID kỳ học',
  })
  getMySchedule(@Req() req: any, @Query('semester_id') semesterId?: string) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    const parsedSemesterId = semesterId ? BigInt(semesterId) : undefined;
    return this.studentsService.getMySchedule(userId, parsedSemesterId);
  }

  @Get(':code/schedule')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Xem thời khóa biểu của sinh viên theo mã SV (Admin, Lecturer)',
  })
  @ApiQuery({
    name: 'semester_id',
    required: false,
    type: String,
    description: 'ID kỳ học',
  })
  getStudentSchedule(
    @Param('code') code: string,
    @Query('semester_id') semesterId?: string,
  ) {
    const parsedSemesterId = semesterId ? BigInt(semesterId) : undefined;
    return this.studentsService.getScheduleByCode(code, parsedSemesterId);
  }

  @Get(':code')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({
    summary: 'Lấy thông tin sinh viên theo mã SV (Admin, Lecturer)',
  })
  findByCode(@Param('code') code: string) {
    return this.studentsService.findByCode(code);
  }

  @Patch(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin sinh viên theo mã SV (Admin)' })
  update(
    @Param('code') code: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(code, updateStudentDto);
  }

  @Delete('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa nhiều sinh viên cùng lúc (Admin)' })
  bulkRemove(@Body() bulkDeleteDto: BulkDeleteStudentsDto) {
    return this.studentsService.bulkRemove(bulkDeleteDto.student_codes);
  }

  @Delete(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa sinh viên theo mã SV (Admin)' })
  remove(@Param('code') code: string) {
    return this.studentsService.remove(code);
  }
}
