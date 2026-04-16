import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsService } from '../statistics/statistics.service';
import {
  GenerateReportQueryDto,
  ExportAttendanceReportDto,
  ReportFormat,
} from './dto/report-query.dto';
import { ReportGenerationResponseDto } from './dto/report-response.dto';
import { GetAttendanceStatsDto } from '../statistics/dto/statistics-query.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly REPORTS_DIR = path.join(process.cwd(), 'uploads', 'reports');
  private readonly AT_RISK_THRESHOLD = 75;

  constructor(
    private readonly prisma: PrismaService,
    private readonly statisticsService: StatisticsService,
  ) {
    this.ensureReportsDirectory();
  }

  async generateComprehensiveReport(
    query: GenerateReportQueryDto,
  ): Promise<ReportGenerationResponseDto> {
    try {
      this.validateDateRange(query);

      const fileName = this.generateFileName(
        'comprehensive_report',
        query.format || ReportFormat.EXCEL,
      );
      const filePath = path.join(this.REPORTS_DIR, fileName);

      if (query.format === ReportFormat.EXCEL) {
        const recordCount = await this.generateExcelReport(
          filePath,
          query,
          fileName,
        );

        return this.createSuccessResponse(
          fileName,
          filePath,
          recordCount,
          query.format,
          'Báo cáo tổng hợp chuyên cần cuối kỳ',
        );
      } else {
        throw new BadRequestException('Định dạng PDF chưa được hỗ trợ');
      }
    } catch (error) {
      this.logger.error(`Error generating report: ${error.message}`);
      throw new InternalServerErrorException(
        'Lỗi khi tạo báo cáo: ' + error.message,
      );
    }
  }

  async exportAttendanceReport(
    query: ExportAttendanceReportDto,
  ): Promise<Buffer> {
    try {
      this.logger.log(
        `Exporting attendance report: semesterId=${query.semesterId}, format=${query.format}`,
      );

      // Lấy dữ liệu thống kê từ StatisticsService
      const statsQuery: GetAttendanceStatsDto = {
        semesterId: query.semesterId,
        facultyId: query.facultyId,
        classId: query.classId,
      };

      const overallStats =
        await this.statisticsService.getOverallAttendanceStats(statsQuery);
      const atRiskStats =
        await this.statisticsService.getStudentsAtRisk(statsQuery);

      // Tạo file Excel và trả về Buffer
      const buffer = await this.generateExcelBuffer(
        overallStats,
        atRiskStats,
        query,
      );

      this.logger.log('Attendance report exported successfully');
      return buffer;
    } catch (error) {
      this.logger.error(`Error exporting attendance report: ${error.message}`);
      throw new InternalServerErrorException(
        'Lỗi khi xuất báo cáo chuyên cần: ' + error.message,
      );
    }
  }

  /**
   * Tạo file Excel với dữ liệu thống kê chuyên cần và trả về Buffer
   * @param overallStats - Dữ liệu thống kê tổng hợp từ StatisticsService
   * @param atRiskStats - Dữ liệu sinh viên có nguy cơ từ StatisticsService
   * @param query - Query parameters từ client
   * @returns Buffer của file Excel
   */
  private async generateExcelBuffer(
    overallStats: any,
    atRiskStats: any,
    query: ExportAttendanceReportDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Tổng quan (Summary)
    const summarySheet = workbook.addWorksheet('Tổng Quan');
    this.buildSummarySheetNew(summarySheet, overallStats, query);

    // Sheet 2: Tỷ lệ chuyên cần (Attendance Rates)
    const attendanceSheet = workbook.addWorksheet('Tỷ Lệ Chuyên Cần');
    this.buildAttendanceRatesSheet(attendanceSheet, overallStats);

    // Sheet 3: Danh sách sinh viên nguy cơ (nếu includeDetails = true)
    if (query.includeDetails && atRiskStats.studentsAtRisk?.length > 0) {
      const atRiskSheet = workbook.addWorksheet('Sinh Viên Nguy Cơ');
      this.buildStudentsAtRiskSheet(atRiskSheet, atRiskStats.studentsAtRisk);
    }

    // Lưu workbook vào buffer (không lưu file)
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  /**
   * Xây dựng Sheet 1: Tổng quan (Summary)
   * Hiển thị các số liệu tổng hợp về chuyên cần
   */
  private buildSummarySheetNew(
    worksheet: ExcelJS.Worksheet,
    overallStats: any,
    query: ExportAttendanceReportDto,
  ): void {
    // Tiêu đề
    worksheet.columns = [
      { header: 'Tiêu Đề', key: 'title', width: 30 },
      { header: 'Giá Trị', key: 'value', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Dữ liệu tóm tắt
    worksheet.addRow(['BÁO CÁO CHUYÊN CẦN SINH VIÊN', '']);
    worksheet.addRow(['', '']);

    // Thông tin báo cáo
    worksheet.addRow(['Ngày tạo báo cáo', new Date().toLocaleString('vi-VN')]);
    worksheet.addRow(['Học kỳ', query.semesterId || 'Tất cả']);
    worksheet.addRow(['Khoa', query.facultyId || 'Tất cả']);
    worksheet.addRow(['Lớp học phần', query.classId || 'Tất cả']);
    worksheet.addRow(['', '']);

    // Thống kê chuyên cần
    const summary = overallStats?.summary || {};
    worksheet.addRow(['THỐNG KÊ CHUYÊN CẦN', '']);
    worksheet.addRow(['Tổng số sinh viên', summary.totalStudents || 0]);
    worksheet.addRow([
      'Sinh viên chuyên cần tốt (≥80%)',
      summary.goodAttendance || 0,
    ]);
    worksheet.addRow([
      'Sinh viên cảnh báo (70-80%)',
      summary.warningAttendance || 0,
    ]);
    worksheet.addRow([
      'Sinh viên nguy cơ (<70%)',
      summary.criticalAttendance || 0,
    ]);
    worksheet.addRow([
      'Tỷ lệ chuyên cần trung bình',
      `${summary.averageAttendanceRate || 0}%`,
    ]);

    // Format số
    worksheet.getColumn('value').numFmt = '0.00';

    // Style dòng tiêu đề nhỏ
    for (let i = 7; i <= 12; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
    }
  }

  /**
   * Xây dựng Sheet 2: Tỷ lệ chuyên cần (Attendance Rates)
   * Hiển thị chi tiết tỷ lệ chuyên cần theo từng mức
   */
  private buildAttendanceRatesSheet(
    worksheet: ExcelJS.Worksheet,
    overallStats: any,
  ): void {
    worksheet.columns = [
      { header: 'Mức Tỷ Lệ', key: 'name', width: 25 },
      { header: 'Số Lượng', key: 'quantity', width: 15 },
      { header: 'Tỷ Lệ Phần Trăm', key: 'percentage', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Thêm dữ liệu từ attendanceRates
    const rates = overallStats?.attendanceRates || [];
    for (const rate of rates) {
      const row = {
        name: rate.name || 'N/A',
        quantity: rate.quantity || 0,
        percentage: `${rate.percentage || 0}%`,
      };
      worksheet.addRow(row);

      // Format theo mức
      const lastRow = worksheet.lastRow;
      if (lastRow) {
        if (rate.name?.includes('Tốt')) {
          lastRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' }, // Xanh nhạt
          };
        } else if (rate.name?.includes('Cảnh báo')) {
          lastRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE699' }, // Vàng nhạt
          };
        } else if (rate.name?.includes('Nguy cơ')) {
          lastRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCC99' }, // Cam nhạt
          };
        }
      }
    }

    worksheet.getColumn('quantity').alignment = { horizontal: 'center' };
    worksheet.getColumn('percentage').alignment = { horizontal: 'center' };
  }

  /**
   * Xây dựng Sheet 3: Danh sách sinh viên nguy cơ (Students at Risk)
   * Hiển thị thông tin chi tiết của sinh viên có nguy cơ
   * @param worksheet - Sheet để thêm dữ liệu
   * @param studentsAtRisk - Danh sách sinh viên nguy cơ
   */
  private buildStudentsAtRiskSheet(
    worksheet: ExcelJS.Worksheet,
    studentsAtRisk: any[],
  ): void {
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Mã Sinh Viên', key: 'studentCode', width: 15 },
      { header: 'Họ Tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Lớp', key: 'className', width: 12 },
      { header: 'Khóa Học', key: 'courseClassName', width: 20 },
      { header: 'Tỷ Lệ Chuyên Cần %', key: 'attendanceRate', width: 15 },
      { header: 'Tổng Buổi', key: 'totalSessions', width: 10 },
      { header: 'Có Mặt', key: 'presentSessions', width: 10 },
      { header: 'Vắng', key: 'absentSessions', width: 10 },
      { header: 'Mức Độ Nguy Cơ', key: 'riskLevel', width: 15 },
      { header: 'Ghi Chú', key: 'notes', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD32F2F' }, // Đỏ cho sheet nguy cơ
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Thêm dữ liệu sinh viên
    let stt = 1;
    for (const student of studentsAtRisk) {
      const row = {
        stt: stt++,
        studentCode: student.studentCode || 'N/A',
        fullName: student.fullName || 'N/A',
        email: student.email || 'N/A',
        className: student.className || 'N/A',
        courseClassName: student.courseClassName || 'N/A',
        attendanceRate: student.attendanceRate || 0,
        totalSessions: student.totalSessions || 0,
        presentSessions: student.presentSessions || 0,
        absentSessions: student.absentSessions || 0,
        riskLevel: student.riskLevel || 'WARNING',
        notes: student.notes || '',
      };
      worksheet.addRow(row);

      // Style theo mức độ nguy cơ
      const lastRow = worksheet.lastRow;
      if (lastRow) {
        if (student.riskLevel === 'CRITICAL') {
          lastRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' }, // Đỏ nhạt
          };
        } else if (student.riskLevel === 'WARNING') {
          lastRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE699' }, // Vàng nhạt
          };
        }
      }
    }

    // Căn giữa các cột số
    worksheet.getColumn('stt').alignment = { horizontal: 'center' };
    worksheet.getColumn('attendanceRate').numFmt = '0.00';
    worksheet.getColumn('attendanceRate').alignment = { horizontal: 'center' };
    worksheet.getColumn('totalSessions').alignment = { horizontal: 'center' };
    worksheet.getColumn('presentSessions').alignment = { horizontal: 'center' };
    worksheet.getColumn('absentSessions').alignment = { horizontal: 'center' };

    // Freeze pane (giữ header khi scroll)
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto filter cho dữ liệu
    if (studentsAtRisk.length > 0) {
      worksheet.autoFilter = {
        from: 'A1',
        to: `L${studentsAtRisk.length + 1}`,
      } as any;
    }
  }

  private async generateExcelReport(
    filePath: string,
    query: GenerateReportQueryDto,
    fileName: string,
  ): Promise<number> {
    const workbook = new ExcelJS.Workbook();

    const where = this.buildWhereClause(query);

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { course_class: where.courseClassWhere },
      take: query.limit || 100,
      skip: ((query.page || 1) - 1) * (query.limit || 100),
      include: {
        student: true,
        course_class: { include: { subject: true, lecturer: true } },
      },
    });

    const attendanceSheet = workbook.addWorksheet('Dữ liệu Chuyên cần');
    this.buildAttendanceSheet(
      attendanceSheet,
      enrollments,
      query,
      where.sessionWhere,
    );

    const summarySheet = workbook.addWorksheet('Tổng hợp');
    await this.buildSummarySheet(summarySheet, enrollments, where);

    await workbook.xlsx.writeFile(filePath);

    this.logger.log(
      `Excel report generated successfully: ${fileName} (${enrollments.length} records)`,
    );

    return enrollments.length;
  }

  private buildAttendanceSheet(
    worksheet: ExcelJS.Worksheet,
    enrollments: any[],
    query: GenerateReportQueryDto,
    sessionWhere: any,
  ): void {
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Mã Sinh Viên', key: 'studentCode', width: 15 },
      { header: 'Họ Tên', key: 'fullName', width: 25 },
      { header: 'Lớp', key: 'className', width: 12 },
      {
        header: 'Khoá Học',
        key: 'courseClassName',
        width: 20,
      },
      { header: 'Giảng Viên', key: 'lecturer', width: 20 },
      { header: 'Tổng Buổi', key: 'totalSessions', width: 10 },
      { header: 'Có Mặt', key: 'present', width: 10 },
      { header: 'Muộn', key: 'late', width: 10 },
      { header: 'Phép', key: 'excused', width: 10 },
      { header: 'Vắng', key: 'absent', width: 10 },
      { header: 'Tỷ Lệ %', key: 'rate', width: 12 },
      { header: 'Trạng Thái', key: 'status', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    let stt = 1;
    for (const enrollment of enrollments) {
      let present = 0,
        absent = 0,
        late = 0,
        excused = 0;

      const row = {
        stt: stt++,
        studentCode: enrollment.student.student_code,
        fullName: enrollment.student.full_name,
        className: enrollment.student.class_name,
        courseClassName: enrollment.course_class.subject?.subject_name,
        lecturer: enrollment.course_class.lecturer?.full_name || 'N/A',
        totalSessions: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        rate: 0,
        status: 'N/A',
      };

      worksheet.addRow(row);
    }

    worksheet.getColumn('stt').alignment = { horizontal: 'center' };
    worksheet.getColumn('rate').numFmt = '0.00';
  }

  private async buildSummarySheet(
    worksheet: ExcelJS.Worksheet,
    enrollments: any[],
    where: any,
  ): Promise<void> {
    worksheet.addRow(['BÁO CÁO TỔNG HỢP CHUYÊN CẦN']);
    worksheet.addRow([]);
    worksheet.addRow(['Ngày tạo báo cáo', new Date().toLocaleString('vi-VN')]);
    worksheet.addRow(['Tổng số sinh viên', enrollments.length]);
    worksheet.addRow([]);
    worksheet.addRow(['Thống kê']);
  }

  private buildWhereClause(query: any) {
    const courseClassWhere: any = {};
    const sessionWhere: any = {};

    if (query.semesterId)
      courseClassWhere.semester_id = BigInt(query.semesterId);
    if (query.classId) courseClassWhere.id = BigInt(query.classId);
    if (query.facultyId)
      courseClassWhere.lecturer = {
        department: { contains: query.facultyId },
      };

    if (query.startDate || query.endDate) {
      sessionWhere.date = {};
      if (query.startDate) sessionWhere.date.gte = new Date(query.startDate);
      if (query.endDate) sessionWhere.date.lte = new Date(query.endDate);
    }

    return { courseClassWhere, sessionWhere };
  }

  private validateDateRange(query: any) {
    if (
      query.startDate &&
      query.endDate &&
      new Date(query.startDate) > new Date(query.endDate)
    ) {
      throw new BadRequestException(
        'Ngày bắt đầu không thể lớn hơn ngày kết thúc',
      );
    }
  }

  private generateFileName(prefix: string, format: ReportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const extension = format === ReportFormat.EXCEL ? 'xlsx' : 'pdf';
    return `${prefix}_${timestamp}_${Date.now()}.${extension}`;
  }

  private createSuccessResponse(
    fileName: string,
    filePath: string,
    recordCount: number,
    format: ReportFormat,
    notes: string,
  ): ReportGenerationResponseDto {
    const fileSize = fs.statSync(filePath).size;

    return {
      status: 'success',
      fileName,
      fileSize,
      downloadUrl: `/api/reports/download/${fileName}`,
      generatedAt: new Date().toISOString(),
      recordCount,
      format: format === ReportFormat.EXCEL ? 'xlsx' : format,
      notes,
    };
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.REPORTS_DIR)) {
      fs.mkdirSync(this.REPORTS_DIR, { recursive: true });
      this.logger.log(`Reports directory created: ${this.REPORTS_DIR}`);
    }
  }

  async downloadReport(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.REPORTS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File báo cáo không tồn tại');
    }

    return fs.readFileSync(filePath);
  }

  async cleanupOldReports(daysOld: number = 7): Promise<number> {
    const files = fs.readdirSync(this.REPORTS_DIR);
    const now = Date.now();
    const deleteOlderThan = daysOld * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(this.REPORTS_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > deleteOlderThan) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    this.logger.log(`Cleanup completed: ${deletedCount} old report(s) deleted`);
    return deletedCount;
  }
}
