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
  

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
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

  async getTokens(userId: string | bigint, username: string, role: string) {
    const payload = { username, sub: userId.toString(), role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'defaultSecretKey',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refreshKey',
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async login(user: any) {
    const tokens = await this.getTokens(user.id, user.username, user.role);
    await this.usersService.setCurrentRefreshToken(tokens.refresh_token, user.id);

    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
      }
    };
  }

  async logout(userId: string | bigint) {
    await this.usersService.removeRefreshToken(userId);
  }

  async refreshTokens(userId: string | bigint, refreshToken: string) {
    const user = await this.usersService.getUserIfRefreshTokenMatches(
      refreshToken,
      userId,
    );
    if (!user) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.username, user.role);
    await this.usersService.setCurrentRefreshToken(tokens.refresh_token, user.id);
    return tokens;
  }

  async googleLogin(req) {
    if (!req.user || !req.user.email) {
      return 'No user from google';
    }
    
    let user = await this.usersService.findUserBySystemEmail(req.user.email);
    
    if (!user) {
      throw new UnauthorizedException('Email này chưa được liên kết với bất kỳ tài khoản sinh viên hay giảng viên nào trong hệ thống.');
    }

    const tokens = await this.getTokens(user.id, user.username, user.role);
    await this.usersService.setCurrentRefreshToken(tokens.refresh_token, user.id);

    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
      }
    };
  }
}
