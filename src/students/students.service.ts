import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentProfileDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateStudentDto): Promise<any> {
    const username = data.student_code;

    // Check uniqueness of username (student_code)
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException(`Tài khoản với mã sinh viên ${username} đã tồn tại!`);
    }

    // Check uniqueness of student_code in students table
    const existingStudent = await this.prisma.student.findUnique({
      where: { student_code: data.student_code },
    });
    if (existingStudent) {
      throw new ConflictException(`Mã sinh viên ${data.student_code} đã tồn tại!`);
    }

    // Check uniqueness of email
    const existingEmail = await this.prisma.student.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException(`Email ${data.email} đã được sử dụng!`);
    }

    // Hash password
    const plainPassword = data.password || '123456';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Transaction: create User + Student profile
    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: username,
          password: hashedPassword,
          role: Role.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          user_id: newUser.id,
          student_code: data.student_code,
          full_name: data.full_name,
          dob: new Date(data.dob),
          gender: data.gender,
          phone_number: data.phone_number,
          class_name: data.class_name,
          email: data.email,
          address: data.address,
          major_name: data.major_name,
          department_name: data.department_name,
        },
      });

      return {
        id: student.id.toString(),
        user_id: newUser.id.toString(),
        student_code: student.student_code,
        full_name: student.full_name,
        email: student.email,
        class_name: student.class_name,
        role: newUser.role,
      };
    });
  }

  async findAll(): Promise<any[]> {
    const students = await this.prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    });

    return students.map((s) => ({
      ...s,
      id: s.id.toString(),
      user_id: s.user_id.toString(),
      user: s.user
        ? {
            ...s.user,
            id: s.user.id.toString(),
          }
        : null,
    }));
  }

  async findByCode(code: string): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { student_code: code },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên với mã ${code}`);
    }

    return {
      ...student,
      id: student.id.toString(),
      user_id: student.user_id.toString(),
      user: student.user
        ? {
            ...student.user,
            id: student.user.id.toString(),
          }
        : null,
    };
  }

  async update(code: string, data: UpdateStudentDto): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { student_code: code },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên với mã ${code}`);
    }

    const updateData: any = { ...data };
    if (data.dob) {
      updateData.dob = new Date(data.dob);
    }

    const updated = await this.prisma.student.update({
      where: { student_code: code },
      data: updateData,
    });

    return {
      ...updated,
      id: updated.id.toString(),
      user_id: updated.user_id.toString(),
    };
  }

  async updateProfile(userId: bigint, data: UpdateStudentProfileDto): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy hồ sơ sinh viên.');
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== student.email) {
      const existingEmail = await this.prisma.student.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictException(`Email ${data.email} đã được sử dụng!`);
      }
    }

    const updated = await this.prisma.student.update({
      where: { user_id: userId },
      data: {
        phone_number: data.phone_number,
        address: data.address,
        email: data.email,
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      user_id: updated.user_id.toString(),
    };
  }

  async getMySchedule(userId: bigint, semesterId?: bigint): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy hồ sơ sinh viên.');
    }

    return this.getClassesForStudent(student.id, semesterId);
  }

  async getScheduleByCode(code: string, semesterId?: bigint): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { student_code: code },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên với mã ${code}`);
    }

    return this.getClassesForStudent(student.id, semesterId);
  }

  private async getClassesForStudent(studentId: bigint, semesterId?: bigint): Promise<any[]> {
    const whereClause: any = {
      enrollments: {
        some: {
          student_id: studentId,
        },
      },
    };

    if (semesterId) {
      whereClause.semester_id = semesterId;
    }

    const schedules = await this.prisma.courseClass.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            subject_code: true,
            subject_name: true,
            credits: true,
          },
        },
        lecturer: {
          select: {
            full_name: true,
            email: true,
          },
        },
        semester: {
          select: {
            semester_name: true,
            academic_year: true,
          },
        },
      },
      orderBy: [
        { start_date: 'asc' },
        { day_of_week: 'asc' },
      ],
    });

    return schedules.map((cls) => ({
      ...cls,
      id: cls.id.toString(),
      subject_id: cls.subject_id.toString(),
      lecturer_id: cls.lecturer_id.toString(),
      semester_id: cls.semester_id.toString(),
    }));
  }

  async remove(code: string): Promise<any> {
    const student = await this.prisma.student.findUnique({
      where: { student_code: code },
    });

    if (!student) {
      throw new NotFoundException(`Không tìm thấy sinh viên với mã ${code}`);
    }

    // Transaction: delete student profile + user account
    return this.prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: { student_code: code },
      });

      const deletedUser = await tx.user.delete({
        where: { id: student.user_id },
      });

      return {
        message: `Đã xóa sinh viên ${code} và tài khoản liên kết.`,
        user_id: deletedUser.id.toString(),
      };
    });
  }

  async bulkCreateFromExcel(fileBuffer: Uint8Array): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('File Excel không có sheet nào.');
    }

    // Expected columns: student_code, password, full_name, dob, gender, phone_number, class_name, email, address, major_name, department_name
    const results: { success: any[]; errors: any[] } = { success: [], errors: [] };
    const rows: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      rows.push({ rowNumber, values: row.values });
    });

    for (const { rowNumber, values } of rows) {
      try {
        const studentCode = values[1]?.toString().trim();
        const password = '123456';
        const fullName = values[2]?.toString().trim();
        const dobRaw = values[3];
        const genderRaw = values[4]?.toString().trim().toUpperCase();
        const phoneNumber = values[5]?.toString().trim();
        const className = values[6]?.toString().trim();
        const email = values[7]?.toString().trim();
        const address = values[8]?.toString().trim() || null;
        const majorName = values[9]?.toString().trim() || null;
        const departmentName = values[10]?.toString().trim() || null;

        if (!studentCode || !fullName || !dobRaw || !genderRaw || !phoneNumber || !className || !email) {
          results.errors.push({ row: rowNumber, student_code: studentCode || 'N/A', error: 'Thiếu thông tin bắt buộc.' });
          continue;
        }

        // Parse gender
        const gender = Gender[genderRaw as keyof typeof Gender];
        if (!gender) {
          results.errors.push({ row: rowNumber, student_code: studentCode, error: `Giới tính không hợp lệ: ${genderRaw}. Chấp nhận: MALE, FEMALE, OTHER.` });
          continue;
        }

        // Parse date
        let dob: Date;
        if (dobRaw instanceof Date) {
          dob = dobRaw;
        } else {
          dob = new Date(dobRaw.toString());
        }
        if (isNaN(dob.getTime())) {
          results.errors.push({ row: rowNumber, student_code: studentCode, error: `Ngày sinh không hợp lệ: ${dobRaw}` });
          continue;
        }

        // Check duplicates
        const existingUser = await this.prisma.user.findUnique({ where: { username: studentCode } });
        if (existingUser) {
          results.errors.push({ row: rowNumber, student_code: studentCode, error: 'Mã sinh viên đã tồn tại trong hệ thống.' });
          continue;
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const created = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: { username: studentCode, password: hashedPassword, role: Role.STUDENT },
          });

          const student = await tx.student.create({
            data: {
              user_id: newUser.id,
              student_code: studentCode,
              full_name: fullName,
              dob,
              gender,
              phone_number: phoneNumber,
              class_name: className,
              email,
              address,
              major_name: majorName,
              department_name: departmentName,
            },
          });

          return { student_code: student.student_code, full_name: student.full_name, email: student.email };
        });

        results.success.push(created);
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          student_code: values[1]?.toString() || 'N/A',
          error: error.message || 'Lỗi không xác định.',
        });
      }
    }

    return {
      total_rows: rows.length,
      success_count: results.success.length,
      error_count: results.errors.length,
      success: results.success,
      errors: results.errors,
    };
  }
}
