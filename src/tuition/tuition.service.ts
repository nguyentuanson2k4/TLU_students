import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VNPay,
  ProductCode,
  VnpLocale,
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  InpOrderAlreadyConfirmed,
  IpnUnknownError,
} from 'vnpay';

@Injectable()
export class TuitionService {
  private vnpay: VNPay;

  constructor(private readonly prisma: PrismaService) {
    this.vnpay = new VNPay({
      tmnCode: process.env.VNPAY_TMN_CODE || 'TMNCODE',
      secureSecret: process.env.VNPAY_SECURE_SECRET || 'SECRET',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
    });
  }

  /**
   * Lấy studentId từ userId
   */
  private async getStudentByUserId(userId: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });
    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }
    return student;
  }

  /**
   * Sinh viên xem danh sách học phí các kỳ của mình
   */
  async getMyTuition(userId: bigint) {
    const student = await this.getStudentByUserId(userId);

    return this.prisma.tuitionFee.findMany({
      where: { student_id: student.id },
      include: {
        semester: {
          select: {
            id: true,
            semester_name: true,
            academic_year: true,
            tuition_per_credit: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Sinh viên xem chi tiết học phí của 1 kỳ (kèm danh sách môn)
   */
  async getMyTuitionDetail(userId: bigint, semesterId: bigint) {
    const student = await this.getStudentByUserId(userId);

    const tuitionFee = await this.prisma.tuitionFee.findUnique({
      where: {
        student_id_semester_id: {
          student_id: student.id,
          semester_id: semesterId,
        },
      },
      include: { semester: true },
    });

    if (!tuitionFee) {
      throw new NotFoundException('Không tìm thấy thông tin học phí cho kỳ này');
    }

    // Lấy danh sách môn đã đăng ký trong kỳ
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: {
        student_id: student.id,
        course_class: { semester_id: semesterId },
      },
      include: {
        course_class: {
          include: {
            subject: true,
          },
        },
      },
    });

    const tuitionPerCredit = Number(tuitionFee.semester.tuition_per_credit);

    return {
      tuition_fee: tuitionFee,
      subjects: enrollments.map((e) => ({
        subject_code: e.course_class.subject.subject_code,
        subject_name: e.course_class.subject.subject_name,
        credits: e.course_class.subject.credits,
        amount: e.course_class.subject.credits * tuitionPerCredit,
      })),
      summary: {
        total_credits: enrollments.reduce(
          (sum, e) => sum + e.course_class.subject.credits,
          0,
        ),
        tuition_per_credit: tuitionPerCredit,
        total_amount: Number(tuitionFee.total_amount),
        discount_amount: Number(tuitionFee.discount_amount),
        final_amount: Number(tuitionFee.final_amount),
      },
    };
  }

  /**
   * Admin xem học phí của 1 sinh viên
   */
  async getStudentTuition(studentId: bigint) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    return this.prisma.tuitionFee.findMany({
      where: { student_id: studentId },
      include: {
        semester: true,
        student: {
          select: {
            student_code: true,
            full_name: true,
            class_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Admin xem danh sách học phí chưa đóng
   */
  async getUnpaidTuition() {
    return this.prisma.tuitionFee.findMany({
      where: { status: 'UNPAID' },
      include: {
        student: {
          select: {
            student_code: true,
            full_name: true,
            class_name: true,
            email: true,
          },
        },
        semester: {
          select: {
            semester_name: true,
            academic_year: true,
          },
        },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  /**
   * Tạo URL thanh toán VNPay
   */
  async createPaymentUrl(tuitionFeeId: bigint, userId: bigint, ipAddr: string) {
    const student = await this.getStudentByUserId(userId);

    const tuitionFee = await this.prisma.tuitionFee.findUnique({
      where: { id: tuitionFeeId },
      include: { semester: true },
    });

    if (!tuitionFee) {
      throw new NotFoundException('Học phí không tồn tại');
    }

    if (tuitionFee.student_id !== student.id) {
      throw new BadRequestException('Bạn không có quyền thanh toán học phí này');
    }

    if (tuitionFee.status === 'PAID') {
      throw new BadRequestException('Học phí này đã được thanh toán');
    }

    // Generate unique transaction ref
    const vnpTxnRef = `TF${tuitionFee.id}_${Date.now()}`;

    // Save pending payment status
    await this.prisma.tuitionFee.update({
      where: { id: tuitionFeeId },
      data: {
        vnp_txn_ref: vnpTxnRef,
        payment_status: 'PENDING',
      },
    });

    const returnUrl =
      process.env.VNPAY_RETURN_URL ||
      'http://localhost:3000/tuition/vnpay-return';

    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: Number(tuitionFee.final_amount),
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: vnpTxnRef,
      vnp_OrderInfo: `Thanh toan hoc phi ky ${tuitionFee.semester.semester_name} - SV ${student.student_code}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN,
    });

    return { paymentUrl, vnpTxnRef };
  }

  /**
   * Xử lý IPN callback từ VNPay (server-to-server)
   */
  async handleVnpayIpn(query: any) {
    try {
      const verify = this.vnpay.verifyIpnCall(query);

      if (!verify.isVerified) {
        return IpnFailChecksum;
      }

      if (!verify.isSuccess) {
        // Giao dịch thất bại
        const txnRef = query.vnp_TxnRef;
        if (txnRef) {
          await this.prisma.tuitionFee.updateMany({
            where: { vnp_txn_ref: txnRef, status: 'UNPAID' },
            data: { payment_status: 'FAILED' },
          });
        }
        return IpnUnknownError;
      }

      // Tìm giao dịch trong DB
      const tuitionFee = await this.prisma.tuitionFee.findUnique({
        where: { vnp_txn_ref: verify.vnp_TxnRef },
      });

      if (!tuitionFee) {
        return IpnOrderNotFound;
      }

      // Kiểm tra số tiền (VNPay trả về đơn vị x100)
      if (verify.vnp_Amount !== Number(tuitionFee.final_amount)) {
        return IpnInvalidAmount;
      }

      // Đã thanh toán rồi
      if (tuitionFee.status === 'PAID') {
        return InpOrderAlreadyConfirmed;
      }

      // Cập nhật thành công
      await this.prisma.tuitionFee.update({
        where: { id: tuitionFee.id },
        data: {
          status: 'PAID',
          payment_status: 'SUCCESS',
          paid_at: new Date(),
          transaction_id:
            verify.vnp_TransactionNo?.toString() ||
            query.vnp_TransactionNo?.toString(),
          payment_method: query.vnp_BankCode || 'VNPAY',
        },
      });

      return IpnSuccess;
    } catch (error) {
      console.error('Lỗi xử lý VNPay IPN:', error);
      return IpnUnknownError;
    }
  }

  /**
   * Xử lý Return URL (SV được redirect về)
   */
  async handleVnpayReturn(query: any) {
    try {
      const verify = this.vnpay.verifyReturnUrl(query);

      if (!verify.isVerified) {
        return { success: false, message: 'Chữ ký không hợp lệ' };
      }

      if (!verify.isSuccess) {
        return {
          success: false,
          message: 'Thanh toán không thành công hoặc bị hủy',
        };
      }

      return {
        success: true,
        message: 'Thanh toán thành công',
        transaction_no:
          verify.vnp_TransactionNo?.toString() ||
          query.vnp_TransactionNo?.toString(),
        amount: verify.vnp_Amount,
        order_info: query.vnp_OrderInfo,
      };
    } catch (error) {
      return { success: false, message: 'Đã xảy ra lỗi khi xác thực thanh toán' };
    }
  }
}
