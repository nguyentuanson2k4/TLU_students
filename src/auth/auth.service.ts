import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
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
    await this.usersService.setCurrentRefreshToken(
      tokens.refresh_token,
      user.id,
    );

    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
      },
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
    await this.usersService.setCurrentRefreshToken(
      tokens.refresh_token,
      user.id,
    );
    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
      },
    };
  }

  async googleLogin(req) {
    if (!req.user || !req.user.email) {
      return 'No user from google';
    }

    let user = await this.usersService.findUserBySystemEmail(req.user.email);

    if (!user) {
      throw new UnauthorizedException(
        'Email này chưa được liên kết với bất kỳ tài khoản sinh viên hay giảng viên nào trong hệ thống.',
      );
    }

    const tokens = await this.getTokens(user.id, user.username, user.role);
    await this.usersService.setCurrentRefreshToken(
      tokens.refresh_token,
      user.id,
    );

    return {
      ...tokens,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findUserBySystemEmail(email);
    if (!user) {
      throw new BadRequestException(
        'Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.usersService.saveOtp(user.id, otp);
    await this.mailService.sendOtpEmail(email, otp);

    return { message: 'Mã OTP đã được gửi đến email của bạn.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findUserBySystemEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại.');
    }

    const dbUser = await this.usersService.findById(user.id);

    // @ts-ignore: properties added to PrismaSchema
    if (!dbUser.reset_password_otp || !dbUser.reset_password_expires) {
      throw new BadRequestException(
        'Mã OTP không hợp lệ hoặc chưa được yêu cầu.',
      );
    }

    // @ts-ignore: properties added to PrismaSchema
    if (dbUser.reset_password_otp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }

    // @ts-ignore: properties added to PrismaSchema
    if (new Date() > dbUser.reset_password_expires) {
      throw new BadRequestException('Mã OTP đã hết hạn.');
    }

    return { message: 'Xác minh OTP thành công.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    await this.verifyOtp(email, otp);

    const user = await this.usersService.findUserBySystemEmail(email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại.');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    await this.usersService.clearOtp(user.id);

    return {
      message:
        'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  async changePassword(
    userId: string | bigint,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác.');
    }

    // Hash new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await this.usersService.update(userId, {
      password: hashedPassword,
    });

    return { message: 'Thay đổi mật khẩu thành công.' };
  }
}
