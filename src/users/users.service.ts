import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    if (!data.phone_number) {
      throw new BadRequestException('Số điện thoại là bắt buộc để làm username.');
    }

    const username = data.phone_number;

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('Tài khoản với số điện thoại này đã tồn tại!');
    }

    let hashedPassword = data.password;
    if (hashedPassword) {
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    } else {
      throw new BadRequestException('Mật khẩu là bắt buộc.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Base User
      const newUser = await tx.user.create({
        data: {
          username: username,
          password: hashedPassword,
          role: data.role as Role || Role.STUDENT,
        },
      });

      // 2. Link Profile
      if (newUser.role === Role.STUDENT) {
        await tx.student.create({
          data: {
            user_id: newUser.id,
            student_code: data.student_code,
            full_name: data.full_name,
            dob: new Date(data.dob),
            gender: data.gender,
            phone_number: data.phone_number,
            class_name: data.class_name,
            address: data.address,
            email: data.email,
            major_name: data.major_name,
            department_name: data.department_name,
          },
        });
      } else if (newUser.role === Role.LECTURER) {
        await tx.lecturer.create({
          data: {
            user_id: newUser.id,
            lecturer_code: data.lecturer_code,
            full_name: data.full_name,
            department: data.department || "General",
            phone_number: data.phone_number,
            email: data.email,
            major_name: data.major_name,
            degree: data.degree,
          },
        });
      }

      const { password, ...result } = newUser;
      return {
        ...result,
        id: result.id.toString(),
      };
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findById(id: string | bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: typeof id === 'string' ? BigInt(id) : id },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findUserBySystemEmail(email: string): Promise<User | null> {
    // Check in Student table first
    const student = await this.prisma.student.findUnique({
      where: { email },
    });
    if (student) {
      return this.prisma.user.findUnique({ where: { id: student.user_id } });
    }

    // Check in Lecturer table
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { email },
    });
    if (lecturer) {
      return this.prisma.user.findUnique({ where: { id: lecturer.user_id } });
    }

    return null;
  }

  async update(id: string | bigint, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id: typeof id === 'string' ? BigInt(id) : id },
      data,
    });
  }

  async remove(id: string | bigint): Promise<User> {
    return this.prisma.user.delete({
      where: { id: typeof id === 'string' ? BigInt(id) : id },
    });
  }

  async setCurrentRefreshToken(refreshToken: string, userId: string | bigint) {
    const salt = await bcrypt.genSalt();
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.prisma.user.update({
      where: { id: typeof userId === 'string' ? BigInt(userId) : userId },
      data: {
        refresh_token: currentHashedRefreshToken
      }
    });
  }

  async removeRefreshToken(userId: string | bigint) {
    return this.prisma.user.update({
      where: { id: typeof userId === 'string' ? BigInt(userId) : userId },
      data: {
        refresh_token: null
      }
    });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: string | bigint) {
    const user = await this.findById(userId);

    if (!user || !user.refresh_token) {
      return null;
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.refresh_token
    );

    if (isRefreshTokenMatching) {
      return user;
    }
    return null;
  }
}
