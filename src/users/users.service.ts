import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(data: any): Promise<any> {
    const role = data.role as Role || Role.ADMIN;
    const username = data.username;
    
    if (!username) {
      throw new BadRequestException('Username là bắt buộc.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException(`Tài khoản với username ${username} đã tồn tại!`);
    }

    let hashedPassword = data.password;
    if (hashedPassword) {
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    } else {
      throw new BadRequestException('Mật khẩu là bắt buộc.');
    }

    // Insert Base User
    const newUser = await this.prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
        role: role,
      },
    });

    const { password, ...result } = newUser;
    return {
      ...result,
      id: result.id.toString(),
    };
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findById(id: string | bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: typeof id === 'string' ? BigInt(id) : id },
    });
  }

  async getProfile(userId: string | bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: typeof userId === 'string' ? BigInt(userId) : userId },
      include: {
        student: true,
        lecturer: true,
      },
    });

    if (!user) {
      return null;
    }

    // Loại bỏ các trường nhạy cảm
    const { password, refresh_token, reset_password_otp, reset_password_expires, ...safeUser } = user;

    return {
      ...safeUser,
      id: safeUser.id.toString(),
      student: safeUser.student
        ? {
            ...safeUser.student,
            id: safeUser.student.id.toString(),
            user_id: safeUser.student.user_id.toString(),
          }
        : null,
      lecturer: safeUser.lecturer
        ? {
            ...safeUser.lecturer,
            id: safeUser.lecturer.id.toString(),
            user_id: safeUser.lecturer.user_id.toString(),
          }
        : null,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findUserBySystemEmail(email: string): Promise<User | null> {
    const student = await this.prisma.student.findUnique({
      where: { email },
    });
    if (student) {
      return this.prisma.user.findUnique({ where: { id: student.user_id } });
    }

    const lecturer = await this.prisma.lecturer.findUnique({
      where: { email },
    });
    if (lecturer) {
      return this.prisma.user.findUnique({ where: { id: lecturer.user_id } });
    }

    return null;
  }

  async update(id: string | bigint, data: any): Promise<User> {
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

  async saveOtp(userId: string | bigint, otp: string) {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5);

    await this.prisma.user.update({
      where: { id: typeof userId === 'string' ? BigInt(userId) : userId },
      data: {
        reset_password_otp: otp,
        reset_password_expires: expires,
      },
    });
  }

  async clearOtp(userId: string | bigint) {
    await this.prisma.user.update({
      where: { id: typeof userId === 'string' ? BigInt(userId) : userId },
      data: {
        reset_password_otp: null,
        reset_password_expires: null,
      },
    });
  }
}
