import { Controller, Get, Post, Param, Query, Req, UseGuards, Res } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';

@ApiTags('Tuition')
@Controller('tuition')
export class TuitionController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Xem danh sách học phí các kỳ của tôi' })
  getMyTuition(@Req() req: any) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.tuitionService.getMyTuition(userId);
  }

  @Get('me/:semesterId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Xem chi tiết học phí của 1 kỳ (kèm danh sách môn)' })
  getMyTuitionDetail(@Req() req: any, @Param('semesterId') semesterId: string) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    return this.tuitionService.getMyTuitionDetail(userId, BigInt(semesterId));
  }

  @Get('unpaid')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xem danh sách học phí chưa đóng (Admin)' })
  getUnpaid() {
    return this.tuitionService.getUnpaidTuition();
  }

  @Get('student/:studentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xem học phí của 1 sinh viên (Admin)' })
  getStudentTuition(@Param('studentId') studentId: string) {
    return this.tuitionService.getStudentTuition(BigInt(studentId));
  }

  @Post('pay/:tuitionFeeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay' })
  createPaymentUrl(@Req() req: any, @Param('tuitionFeeId') tuitionFeeId: string) {
    const userId =
      typeof req.user.id === 'string' ? BigInt(req.user.id) : req.user.id;
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    return this.tuitionService.createPaymentUrl(
      BigInt(tuitionFeeId),
      userId,
      Array.isArray(ipAddr) ? ipAddr[0] : ipAddr,
    );
  }

  @Get('vnpay-ipn')
  @ApiOperation({ summary: 'VNPay IPN callback (dành cho VNPay gọi)' })
  async handleVnpayIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.tuitionService.handleVnpayIpn(query);
    return res.json(result);
  }

  @Get('vnpay-return')
  @ApiOperation({ summary: 'VNPay Return URL (SV được redirect về đây sau thanh toán)' })
  async handleVnpayReturn(@Query() query: any) {
    return this.tuitionService.handleVnpayReturn(query);
  }
}
