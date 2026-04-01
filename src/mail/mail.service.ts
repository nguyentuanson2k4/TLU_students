import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    const mailOptions = {
      from: `"Hệ thống Quản lý Sinh viên" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Mã xác nhận đặt lại mật khẩu của bạn',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4CAF50;">Yêu cầu Đặt lại Mật khẩu</h2>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Đây là Mã Xác Nhận của bạn:</p>
          <div style="font-size: 24px; font-weight: bold; padding: 15px; margin: 10px 0; background-color: #f1f1f1; border-radius: 5px; display: inline-block; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>Mã này sẽ hết hạn trong 5 phút. Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>
          <hr style="border-top: 1px solid #ddd; margin-top: 30px;">
          <p style="font-size: 12px; color: #aaa;">Hỗ trợ Kỹ thuật &bull; Hệ thống Quản lý Sinh viên - Giảng viên</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`, error.stack);
      throw new Error('Lỗi hệ thống: Không thể gửi email OTP. Vui lòng thử lại sau.');
    }
  }
}
