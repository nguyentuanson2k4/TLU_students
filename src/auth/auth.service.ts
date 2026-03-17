import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    };
  }

  async register(data: Prisma.UserCreateInput) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại!');
    }
    
    // Hash password
    if (data.password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(data.password, salt);
    }
    
    const newUser = await this.usersService.create(data);
    const { password, ...result } = newUser;
    return result;
  }

  async googleLogin(req) {
    if (!req.user) {
      return 'No user from google';
    }
    
    let user = await this.usersService.findByEmail(req.user.email);
    
    if (!user) {
      // Create new user using Google profile
      user = await this.usersService.create({
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        provider: 'GOOGLE',
        providerId: req.user.providerId,
      });
    }

    // Generate JWT for Google User
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    };
  }
}
