import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { Prisma, User, Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  
  async getAllUsers(filters?: {
    role?: Role;
    is_active?: boolean;
  }): Promise<any[]> {
    const where: Prisma.UserWhereInput = {};
    
    if (filters?.role) {
      where.role = filters.role;
    }
    
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        student: {
          select: {
            full_name: true,
            student_code: true,
            email: true,
          },
        },
        lecturer: {
          select: {
            full_name: true,
            lecturer_code: true,
            email: true,
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile:
        user.role === Role.STUDENT
          ? user.student
          : user.role === Role.LECTURER
            ? user.lecturer
            : null,
    }));
  }

 
  async getUserDetail(userId: string | bigint): Promise<any> {
    const id = typeof userId === 'string' ? BigInt(userId) : userId;

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        student: true,
        lecturer: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    return {
      ...user,
      id: user.id.toString(),
    };
  }

  
  async updateUser(
    userId: string | bigint,
    updateData: {
      username?: string;
      role?: Role;
      password?: string;
    },
  ): Promise<User> {
    const id = typeof userId === 'string' ? BigInt(userId) : userId;

    
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.usersService.findByUsername(
        updateData.username,
      );
      if (existingUser) {
        throw new BadRequestException(
          'Tên đăng nhập này đã được sử dụng',
        );
      }
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (updateData.username) {
      dataToUpdate.username = updateData.username;
    }

    if (updateData.role) {
      dataToUpdate.role = updateData.role;
    }

    if (updateData.password) {
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt();
      dataToUpdate.password = await bcrypt.hash(updateData.password, salt);
    }

    return this.usersService.update(id, dataToUpdate);
  }

  
  async deactivateUser(userId: string | bigint): Promise<User> {
    const id = typeof userId === 'string' ? BigInt(userId) : userId;

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    return this.usersService.update(id, {
      is_active: false,
    });
  }

  
  async activateUser(userId: string | bigint): Promise<User> {
    const id = typeof userId === 'string' ? BigInt(userId) : userId;

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    return this.usersService.update(id, {
      is_active: true,
    });
  }

  
  async deleteUser(userId: string | bigint): Promise<void> {
    const id = typeof userId === 'string' ? BigInt(userId) : userId;

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
    }

    if (user.role === Role.STUDENT) {
      await this.prisma.student.delete({
        where: { user_id: id },
      }).catch(() => null); // Ignore if not found
    } else if (user.role === Role.LECTURER) {
      await this.prisma.lecturer.delete({
        where: { user_id: id },
      }).catch(() => null); // Ignore if not found
    }

    await this.usersService.remove(id);
  }

  
  async createUser(userData: any): Promise<any> {
    return this.usersService.create(userData);
  }
}
