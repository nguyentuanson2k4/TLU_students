import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token: string | null = null;
          if (request && request.headers.authorization) {
            token = request.headers.authorization.replace('Bearer ', '');
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'refreshKey',
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const refreshToken = authorization.replace('Bearer ', '').trim();
    const user = await this.usersService.getUserIfRefreshTokenMatches(
      refreshToken,
      payload.sub,
    );

    if (!user) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    return user;
  }
}
