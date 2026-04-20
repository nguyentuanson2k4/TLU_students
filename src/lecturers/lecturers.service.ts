import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Degree } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import {
  CreateLecturerDto,
  UpdateLecturerDto,
  UpdateLecturerProfileDto,
} from './dto/lecturer.dto';

@Injectable()
export class LecturersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateLecturerDto): Promise<any> {
    const username = data.lecturer_code;

    // Check uniqueness of username (lecturer_code)
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException(
        `Tài khoản với mã giảng viên ${username} đã tồn tại!`,
      );
    }

    // Check uniqueness of lecturer_code in lecturers table
    const existingLecturer = await this.prisma.lecturer.findUnique({
      where: { lecturer_code: data.lecturer_code },
    });
    if (existingLecturer) {
      throw new ConflictException(
        `Mã giảng viên ${data.lecturer_code} đã tồn tại!`,
      );
    }

    // Check uniqueness of email
    const existingEmail = await this.prisma.lecturer.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException(`Email ${data.email} đã được sử dụng!`);
    }

    // Hash password
    const plainPassword = data.password || '123456';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Transaction: create User + Lecturer profile
    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: username,
          password: hashedPassword,
          role: Role.LECTURER,
        },
      });

      const lecturer = await tx.lecturer.create({
        data: {
          user_id: newUser.id,
          lecturer_code: data.lecturer_code,
          full_name: data.full_name,
          department: data.department,
          phone_number: data.phone_number,
          email: data.email,
          major_name: data.major_name,
          degree: data.degree,
        },
      });

      return {
        id: lecturer.id.toString(),
        user_id: newUser.id.toString(),
        lecturer_code: lecturer.lecturer_code,
        full_name: lecturer.full_name,
        email: lecturer.email,
        department: lecturer.department,
        degree: lecturer.degree,
        role: newUser.role,
      };
    });
  }

  async findAll(): Promise<any[]> {
    const lecturers = await this.prisma.lecturer.findMany({
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

    return lecturers.map((l) => ({
      ...l,
      id: l.id.toString(),
      user_id: l.user_id.toString(),
      user: l.user
        ? {
            ...l.user,
            id: l.user.id.toString(),
          }
        : null,
    }));
  }

  async findByCode(code: string): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { lecturer_code: code },
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

    if (!lecturer) {
      throw new NotFoundException(`Không tìm thấy giảng viên với mã ${code}`);
    }

    return {
      ...lecturer,
      id: lecturer.id.toString(),
      user_id: lecturer.user_id.toString(),
      user: lecturer.user
        ? {
            ...lecturer.user,
            id: lecturer.user.id.toString(),
          }
        : null,
    };
  }

  async update(code: string, data: UpdateLecturerDto): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { lecturer_code: code },
    });

    if (!lecturer) {
      throw new NotFoundException(`Không tìm thấy giảng viên với mã ${code}`);
    }

    const updated = await this.prisma.lecturer.update({
      where: { lecturer_code: code },
      data,
    });

    return {
      ...updated,
      id: updated.id.toString(),
      user_id: updated.user_id.toString(),
    };
  }

  async updateProfile(
    userId: bigint,
    data: UpdateLecturerProfileDto,
  ): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { user_id: userId },
    });

    if (!lecturer) {
      throw new NotFoundException('Không tìm thấy hồ sơ giảng viên.');
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== lecturer.email) {
      const existingEmail = await this.prisma.lecturer.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictException(`Email ${data.email} đã được sử dụng!`);
      }
    }

    const updated = await this.prisma.lecturer.update({
      where: { user_id: userId },
      data: {
        phone_number: data.phone_number,
        email: data.email,
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      user_id: updated.user_id.toString(),
    };
  }

  async getMyClasses(userId: bigint): Promise<any[]> {
    // Tìm giảng viên từ user_id
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { user_id: userId },
    });

    if (!lecturer) {
      throw new NotFoundException('Không tìm thấy hồ sơ giảng viên.');
    }

    // Lấy tất cả các lớp được phân công dạy
    const courseClasses = await this.prisma.courseClass.findMany({
      where: {
        lecturer_id: lecturer.id,
      },
      include: {
        subject: {
          select: {
            id: true,
            subject_code: true,
            subject_name: true,
            credits: true,
          },
        },
        semester: {
          select: {
            id: true,
            semester_name: true,
            academic_year: true,
          },
        },
        enrollments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { semester: { academic_year: 'desc' } },
        { created_at: 'desc' },
      ],
    });

    return courseClasses.map((cc) => ({
      id: cc.id.toString(),
      subject: cc.subject,
      semester: cc.semester,
      room: cc.room,
      latitude: cc.latitude,
      longitude: cc.longitude,
      allowed_radius: cc.allowed_radius,
      max_students: cc.max_students,
      current_students: cc.enrollments.length,
      day_of_week: cc.day_of_week,
      lesson_slot: cc.lesson_slot,
      start_date: cc.start_date,
      end_date: cc.end_date,
      created_at: cc.created_at,
      updated_at: cc.updated_at,
    }));
  }

  async remove(code: string): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { lecturer_code: code },
    });

    if (!lecturer) {
      throw new NotFoundException(`Không tìm thấy giảng viên với mã ${code}`);
    }

    // Transaction: delete lecturer profile + user account
    return this.prisma.$transaction(async (tx) => {
      await tx.lecturer.delete({
        where: { lecturer_code: code },
      });

      const deletedUser = await tx.user.delete({
        where: { id: lecturer.user_id },
      });

      return {
        message: `Đã xóa giảng viên ${code} và tài khoản liên kết.`,
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

    // Expected columns: lecturer_code, password, full_name, department, phone_number, email, major_name, degree
    const results: { success: any[]; errors: any[] } = {
      success: [],
      errors: [],
    };
    const rows: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      rows.push({ rowNumber, values: row.values });
    });

    for (const { rowNumber, values } of rows) {
      try {
        const lecturerCode = values[1]?.toString().trim();
        const password = '123456';
        const fullName = values[2]?.toString().trim();
        const department = values[3]?.toString().trim();
        const phoneNumber = values[4]?.toString().trim();
        const email = values[5]?.toString().trim();
        const majorName = values[6]?.toString().trim() || null;
        const degreeRaw = values[7]?.toString().trim().toUpperCase();

        if (
          !lecturerCode ||
          !fullName ||
          !department ||
          !phoneNumber ||
          !email ||
          !degreeRaw
        ) {
          results.errors.push({
            row: rowNumber,
            lecturer_code: lecturerCode || 'N/A',
            error: 'Thiếu thông tin bắt buộc.',
          });
          continue;
        }

        // Parse degree
        const degree = Degree[degreeRaw as keyof typeof Degree];
        if (!degree) {
          results.errors.push({
            row: rowNumber,
            lecturer_code: lecturerCode,
            error: `Trình độ không hợp lệ: ${degreeRaw}. Chấp nhận: BACHELOR, MASTER, PHD.`,
          });
          continue;
        }

        // Check duplicates
        const existingUser = await this.prisma.user.findUnique({
          where: { username: lecturerCode },
        });
        if (existingUser) {
          results.errors.push({
            row: rowNumber,
            lecturer_code: lecturerCode,
            error: 'Mã giảng viên đã tồn tại trong hệ thống.',
          });
          continue;
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const created = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              username: lecturerCode,
              password: hashedPassword,
              role: Role.LECTURER,
            },
          });

          const lecturer = await tx.lecturer.create({
            data: {
              user_id: newUser.id,
              lecturer_code: lecturerCode,
              full_name: fullName,
              department,
              phone_number: phoneNumber,
              email,
              major_name: majorName,
              degree,
            },
          });

          return {
            lecturer_code: lecturer.lecturer_code,
            full_name: lecturer.full_name,
            email: lecturer.email,
          };
        });

        results.success.push(created);
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          lecturer_code: values[1]?.toString() || 'N/A',
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
