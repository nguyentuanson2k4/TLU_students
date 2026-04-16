import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetAttendanceStatsDto } from './dto/statistics-query.dto';
import {
  AttendanceRateResponseDto,
  StudentAtRiskDto,
  AttendanceStatisticsResponseDto,
} from './dto/attendance-statistics.dto';
import { WarningSeverity } from '@prisma/client';

@Injectable()
export class StatisticsService {
  private readonly GOOD_THRESHOLD = 80;
  private readonly WARNING_THRESHOLD = 70;
  private readonly AT_RISK_THRESHOLD = 75;

  private readonly ATTENDANCE_STATUS = {
    ABSENT: 0,
    HAS_ATTENDED: 1,
    LATE: 2,
    EXCUSED: 3,
  };

  constructor(private readonly prisma: PrismaService) {}

  async getOverallAttendanceStats(
    query: GetAttendanceStatsDto,
  ): Promise<AttendanceStatisticsResponseDto> {
    this.validateDateRange(query);
    const where = this.buildWhereClause(query);

    const totalStudents = await this.prisma.student.count({
      where: {
        enrollments: { some: { course_class: where.courseClassWhere } },
      },
    });

    const attendanceStats = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        session: where.sessionWhere,
        student: {
          enrollments: { some: { course_class: where.courseClassWhere } },
        },
      },
      _count: { id: true },
    });

    const totalRecords = attendanceStats.reduce(
      (sum, s) => sum + s._count.id,
      0,
    );
    if (totalRecords === 0) return this.getEmptyResponse(query);

    const presentCount =
      attendanceStats.find(
        (s) => s.status === this.ATTENDANCE_STATUS.HAS_ATTENDED,
      )?._count.id || 0;
    const lateCount =
      attendanceStats.find((s) => s.status === this.ATTENDANCE_STATUS.LATE)
        ?._count.id || 0;
    const excusedCount =
      attendanceStats.find((s) => s.status === this.ATTENDANCE_STATUS.EXCUSED)
        ?._count.id || 0;

    const averageRate = this.roundNumber(
      ((presentCount + lateCount + excusedCount) / totalRecords) * 100,
    );

    return {
      summary: {
        totalStudents,
        goodAttendance: 0,
        warningAttendance: 0,
        criticalAttendance: 0,
        averageAttendanceRate: averageRate,
      },
      attendanceRates: this.buildRateDtos(totalStudents, averageRate),
      studentsAtRisk: [],
      totalAtRisk: 0,
      statisticsDate: new Date().toISOString().split('T')[0],
      dateRange: query.startDate
        ? { from: query.startDate, to: query.endDate! }
        : undefined,
    };
  }

  async getAttendanceChartData(query: GetAttendanceStatsDto): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string[];
    }>;
  }> {
    const data = await this.getOverallAttendanceStats(query);
    return {
      labels: data.attendanceRates.map((r) => r.name),
      datasets: [
        {
          label: 'Số sinh viên',
          data: data.attendanceRates.map((r) => r.count),
          backgroundColor: data.attendanceRates.map((r) => r.color),
        },
      ],
    };
  }

  async getStudentsAtRisk(
    query: GetAttendanceStatsDto,
  ): Promise<AttendanceStatisticsResponseDto> {
    this.validateDateRange(query);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, query.limit || 20);
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { course_class: where.courseClassWhere },
      skip,
      take: limit,
      include: {
        student: { include: { user: true } },
        course_class: { include: { subject: true } },
      },
    });

    const studentStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        const records = await this.prisma.attendanceRecord.findMany({
          where: {
            student_id: enrollment.student_id,
            session: {
              course_class_id: enrollment.course_class_id,
              ...where.sessionWhere,
            },
          },
        });

        const total = records.length;
        const present = records.filter((r) =>
          [
            this.ATTENDANCE_STATUS.HAS_ATTENDED,
            this.ATTENDANCE_STATUS.LATE,
            this.ATTENDANCE_STATUS.EXCUSED,
          ].includes(r.status),
        ).length;

        const rate =
          total === 0 ? 0 : this.roundNumber((present / total) * 100);

        const warnings = await this.prisma.warningLog.findMany({
          where: {
            user_id: enrollment.student.user_id,
            severity: { in: [WarningSeverity.Medium, WarningSeverity.High] },
            is_resolved: false,
          },
          take: 3,
        });

        return {
          enrollment,
          attendanceRate: rate,
          total,
          present,
          absent: total - present,
          warnings,
        };
      }),
    );

    const atRiskList = studentStats.filter(
      (s) => s.attendanceRate < this.AT_RISK_THRESHOLD || s.warnings.length > 0,
    );

    const dtos: StudentAtRiskDto[] = atRiskList.map((item) => ({
      id: item.enrollment.student_id.toString(),
      studentCode: item.enrollment.student.student_code,
      fullName: item.enrollment.student.full_name,
      email: item.enrollment.student.email || '',
      className: item.enrollment.student.class_name || '',
      courseClassName:
        item.enrollment.course_class.subject?.subject_name || 'N/A',
      attendanceRate: item.attendanceRate,
      totalSessions: item.total,
      presentSessions: item.present,
      absentSessions: item.absent,
      riskLevel:
        item.attendanceRate < this.WARNING_THRESHOLD ? 'CRITICAL' : 'WARNING',
      notes:
        item.warnings.length > 0
          ? `${item.warnings.length} cảnh báo`
          : undefined,
    }));

    return {
      summary: {
        totalStudents: enrollments.length,
        goodAttendance: 0,
        warningAttendance: 0,
        criticalAttendance: 0,
        averageAttendanceRate: 0,
      },
      attendanceRates: [],
      studentsAtRisk: dtos,
      totalAtRisk: atRiskList.length,
      pagination: {
        page,
        limit,
        total: atRiskList.length,
        totalPages: Math.ceil(atRiskList.length / limit),
      },
      statisticsDate: new Date().toISOString().split('T')[0],
      dateRange: query.startDate
        ? { from: query.startDate, to: query.endDate! }
        : undefined,
    };
  }

  private validateDateRange(query: GetAttendanceStatsDto) {
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

  private buildWhereClause(query: GetAttendanceStatsDto) {
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

  private buildRateDtos(
    totalStudents: number,
    avgRate: number,
  ): AttendanceRateResponseDto[] {
    return [
      {
        name: 'Chuyên cần tốt',
        count: totalStudents,
        percentage: avgRate,
        color: '#4CAF50',
      },
      {
        name: 'Cảnh báo',
        count: 0,
        percentage: 0,
        color: '#FF9800',
      },
      {
        name: 'Nguy hiểm',
        count: 0,
        percentage: 0,
        color: '#F44336',
      },
    ];
  }

  private getEmptyResponse(
    query: GetAttendanceStatsDto,
  ): AttendanceStatisticsResponseDto {
    return {
      summary: {
        totalStudents: 0,
        goodAttendance: 0,
        warningAttendance: 0,
        criticalAttendance: 0,
        averageAttendanceRate: 0,
      },
      attendanceRates: this.buildRateDtos(0, 0),
      studentsAtRisk: [],
      totalAtRisk: 0,
      statisticsDate: new Date().toISOString().split('T')[0],
      dateRange: query.startDate
        ? { from: query.startDate, to: query.endDate! }
        : undefined,
    };
  }

  private roundNumber(num: number): number {
    return Math.round(num * 100) / 100;
  }
}
