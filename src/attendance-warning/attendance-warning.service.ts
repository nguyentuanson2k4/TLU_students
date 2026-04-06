import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ATTENDANCE_WARNING_THRESHOLDS,
  getWarningSeverity,
} from '../common/constants';
import { WarningSeverity } from '@prisma/client';

export interface GeneratedWarning {
  userId: number;
  severity: WarningSeverity | null;
  absencePercentage: number;
  absentSessions: number;
  totalSessions: number;
  message: string;
  isCreated: boolean;
}

@Injectable()
export class AttendanceWarningService {
  private readonly logger = new Logger(AttendanceWarningService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateAttendanceWarning(
    absentSessions: number,
    totalSessions: number,
  ): 'High' | 'Medium' | 'Low' | null {
    if (totalSessions <= 0) {
      throw new Error('Total sessions must be greater than 0');
    }

    if (absentSessions < 0) {
      throw new Error('Absent sessions cannot be negative');
    }

    if (absentSessions > totalSessions) {
      throw new Error('Absent sessions cannot exceed total sessions');
    }

    const absencePercentage = (absentSessions / totalSessions) * 100;

    const severity = getWarningSeverity(absencePercentage);

    return severity;
  }

  getDetailedWarning(
    absentSessions: number,
    totalSessions: number,
  ): {
    absencePercentage: number;
    severity: 'High' | 'Medium' | 'Low' | null;
    threshold: number | null;
    isWarning: boolean;
  } {
    if (totalSessions <= 0) {
      throw new Error('Total sessions must be greater than 0');
    }

    if (absentSessions < 0) {
      throw new Error('Absent sessions cannot be negative');
    }

    const absencePercentage = (absentSessions / totalSessions) * 100;
    const severity = getWarningSeverity(absencePercentage);

    let threshold: number | null = null;
    if (severity === 'High') {
      threshold = ATTENDANCE_WARNING_THRESHOLDS.HIGH;
    } else if (severity === 'Medium') {
      threshold = ATTENDANCE_WARNING_THRESHOLDS.MEDIUM;
    } else if (severity === 'Low') {
      threshold = ATTENDANCE_WARNING_THRESHOLDS.LOW;
    }

    return {
      absencePercentage: Math.round(absencePercentage * 100) / 100, // Round to 2 decimal places
      severity,
      threshold,
      isWarning: severity !== null,
    };
  }

  /**
   * Check if student should be warned
   * @param absencePercentage - Student's absence percentage
   * @returns true if absence rate exceeds LOW threshold, false otherwise
   */
  shouldWarnStudent(absencePercentage: number): boolean {
    return absencePercentage >= ATTENDANCE_WARNING_THRESHOLDS.LOW;
  }

  /**
   * Get all configured thresholds
   * @returns Object containing all threshold values
   */
  getThresholds() {
    return {
      low: ATTENDANCE_WARNING_THRESHOLDS.LOW,
      medium: ATTENDANCE_WARNING_THRESHOLDS.MEDIUM,
      high: ATTENDANCE_WARNING_THRESHOLDS.HIGH,
    };
  }

  /**
   * Save warning log to database
   * Stores warning information for tracking and history
   *
   * @param studentId - Student's user ID
   * @param severity - Warning severity level (Low, Medium, High)
   * @param content - Detailed content/reason for the warning
   * @param category - Warning category (default: 'attendance')
   * @returns Created WarningLog entry
   *
   * @example
   * const log = await this.attWarningService.saveWarningLog(
   *   123,
   *   'High',
   *   'Số buổi vắng: 8/40 (20%)',
   *   'attendance'
   * );
   */
  async saveWarningLog(
    studentId: bigint | number,
    severity: WarningSeverity,
    content: string,
    category: string = 'attendance',
  ) {
    try {
      const warningLog = await this.prisma.warningLog.create({
        data: {
          user_id: BigInt(studentId),
          category,
          severity,
          content,
          is_resolved: false,
        },
      });

      this.logger.log(
        `Warning log saved for user ${studentId}: severity=${severity}, category=${category}`,
      );

      return warningLog;
    } catch (error) {
      this.logger.error(
        `Error saving warning log for user ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate warning message based on severity level and absence percentage
   *
   * @param severity - Warning severity level
   * @param absencePercentage - Student's absence percentage
   * @returns Notification message in Vietnamese
   */
  private generateWarningMessage(
    severity: WarningSeverity,
    absencePercentage: number,
  ): string {
    const roundedPercentage = Math.round(absencePercentage * 100) / 100;

    switch (severity) {
      case 'Low':
        return `⚠️ Cảnh báo: Tỷ lệ vắng học của bạn đạt ${roundedPercentage}%. Vui lòng tăng cường tham dự để tránh bị cảnh báo mức cao hơn.`;

      case 'Medium':
        return `⚠️⚠️ Cảnh báo trung cấp: Tỷ lệ vắng học của bạn đã lên tới ${roundedPercentage}%. Vui lòng liên hệ với giảng viên để giải thích và cải thiện tình hình.`;

      case 'High':
        return `🚨 CẢNH BÁO NGHIÊM TRỌNG: Tỷ lệ vắng học của bạn đã vượt ${roundedPercentage}%. Bạn có nguy cơ bị đình chỉ học tập. Vui lòng liên hệ ngay với bộ phận Đào tạo.`;

      default:
        return `Tỷ lệ vắng học của bạn là ${roundedPercentage}%.`;
    }
  }

  /**
   * Generate attendance warning for a student
   * Creates warning log entry and notification if warning should be triggered
   *
   * @param userId - Student's user ID
   * @param absentSessions - Number of sessions student was absent
   * @param totalSessions - Total number of sessions in the class
   * @returns Generated warning details
   * @throws Error if validation fails
   *
   * @example
   * const warning = await this.attWarningService.generateAttendanceWarning(
   *   123,  // userId
   *   8,    // absentSessions
   *   40    // totalSessions
   * );
   * // Returns: {
   * //   userId: 123,
   * //   severity: 'Medium',
   * //   absencePercentage: 20,
   * //   message: '⚠️⚠️ Cảnh báo trung cấp: ...',
   * //   isCreated: true
   * // }
   */
  async generateAttendanceWarning(
    userId: bigint | number,
    absentSessions: number,
    totalSessions: number,
  ): Promise<GeneratedWarning> {
    try {
      // Validate inputs
      if (totalSessions <= 0) {
        throw new Error('Total sessions must be greater than 0');
      }

      if (absentSessions < 0) {
        throw new Error('Absent sessions cannot be negative');
      }

      if (absentSessions > totalSessions) {
        throw new Error('Absent sessions cannot exceed total sessions');
      }

      // Calculate absence percentage
      const absencePercentage = (absentSessions / totalSessions) * 100;

      // Determine severity
      const severity = getWarningSeverity(
        absencePercentage,
      ) as WarningSeverity | null;

      // If no warning needed, return early
      if (!severity) {
        this.logger.debug(
          `No warning generated for user ${userId}: absence ${absencePercentage.toFixed(2)}%`,
        );
        return {
          userId: Number(userId),
          severity: null,
          absencePercentage: Math.round(absencePercentage * 100) / 100,
          absentSessions,
          totalSessions,
          message: 'Tỷ lệ vắng học chưa vượt ngưỡng cảnh báo.',
          isCreated: false,
        };
      }

      // Generate warning message
      const message = this.generateWarningMessage(severity, absencePercentage);

      // Create warning log in database using saveWarningLog method
      const warningContent = `Số buổi vắng: ${absentSessions}/${totalSessions} (${Math.round(absencePercentage * 100) / 100}%)`;
      const warningLog = await this.saveWarningLog(
        userId,
        severity,
        warningContent,
        'attendance',
      );

      // Create notification for student
      await this.prisma.notification.create({
        data: {
          user_id: BigInt(userId),
          title: `Cảnh báo vắng học mức ${severity === 'High' ? 'Cao' : severity === 'Medium' ? 'Trung bình' : 'Thấp'}`,
          message,
          notification_type: 'attendance_warning',
          source_id: warningLog.id,
          is_read: false,
        },
      });

      this.logger.log(
        `Warning generated for user ${userId}: severity=${severity}, absence=${absencePercentage.toFixed(2)}%`,
      );

      return {
        userId: Number(userId),
        severity,
        absencePercentage: Math.round(absencePercentage * 100) / 100,
        absentSessions,
        totalSessions,
        message,
        isCreated: true,
      };
    } catch (error) {
      this.logger.error(
        `Error generating attendance warning for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate warnings for multiple students at once
   *
   * @param warnings - Array of student warning data
   * @returns Array of generated warnings
   *
   * @example
   * const results = await this.attWarningService.generateAttendanceWarningsBatch([
   *   { userId: 1, absentSessions: 5, totalSessions: 40 },
   *   { userId: 2, absentSessions: 8, totalSessions: 40 },
   * ]);
   */
  async generateAttendanceWarningsBatch(
    warnings: Array<{
      userId: bigint | number;
      absentSessions: number;
      totalSessions: number;
    }>,
  ): Promise<GeneratedWarning[]> {
    const results: GeneratedWarning[] = [];

    for (const warning of warnings) {
      try {
        const result = await this.generateAttendanceWarning(
          warning.userId,
          warning.absentSessions,
          warning.totalSessions,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to generate warning for user ${warning.userId}:`,
          error,
        );
        // Continue processing other warnings
      }
    }

    return results;
  }

  /**
   * Get all warnings with optional filters and pagination
   *
   * @param filters - Filter options (severity, student_code, is_resolved)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of warnings with student info
   */
  async getAllWarnings(
    filters?: {
      severity?: string;
      student_code?: string;
      is_resolved?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause with filters
      const where: any = {};

      if (filters?.severity) {
        where.severity = filters.severity;
      }

      if (filters?.is_resolved !== undefined) {
        where.is_resolved = filters.is_resolved;
      }

      // Get warnings
      const warnings = await this.prisma.warningLog.findMany({
        where,
        include: {
          user: {
            include: {
              student: {
                select: {
                  student_code: true,
                  full_name: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await this.prisma.warningLog.count({ where });

      // Filter by student_code if provided
      let filteredWarnings = warnings;
      if (filters?.student_code) {
        filteredWarnings = warnings.filter((w) =>
          w.user.student?.student_code
            ?.toLowerCase()
            .includes(filters?.student_code?.toLowerCase() || ''),
        );
      }

      return {
        data: filteredWarnings.map((w) => ({
          id: w.id,
          user_id: w.user_id,
          student_code: w.user.student?.student_code,
          student_name: w.user.student?.full_name,
          category: w.category,
          severity: w.severity,
          content: w.content,
          is_resolved: w.is_resolved,
          created_at: w.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error getting all warnings:', error);
      throw error;
    }
  }

  /**
   * Get warning by ID
   *
   * @param warningId - Warning log ID
   * @returns Warning details with student info
   */
  async getWarningById(warningId: bigint | number) {
    try {
      const warning = await this.prisma.warningLog.findUnique({
        where: { id: BigInt(warningId) },
        include: {
          user: {
            include: {
              student: {
                select: {
                  student_code: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      if (!warning) {
        throw new Error(`Warning ${warningId} not found`);
      }

      return {
        id: warning.id,
        user_id: warning.user_id,
        student_code: warning.user.student?.student_code,
        student_name: warning.user.student?.full_name,
        category: warning.category,
        severity: warning.severity,
        content: warning.content,
        is_resolved: warning.is_resolved,
        created_at: warning.created_at,
      };
    } catch (error) {
      this.logger.error(`Error getting warning ${warningId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve a warning
   * Marks a warning as resolved with optional resolution note
   *
   * @param warningId - Warning log ID
   * @param resolutionNote - Note about resolution
   * @returns Updated warning with resolution status
   * @throws Error if warning not found or update fails
   *
   * @example
   * const result = await this.attWarningService.resolveWarning(
   *   123,
   *   'Sinh viên đã cải thiện tham dự'
   * );
   */
  async resolveWarning(warningId: bigint | number, resolutionNote?: string) {
    try {
      // First, get the current warning to check its status
      const currentWarning = await this.prisma.warningLog.findUnique({
        where: { id: BigInt(warningId) },
      });

      if (!currentWarning) {
        throw new Error(`Warning ${warningId} not found`);
      }

      // Check if already resolved
      if (currentWarning.is_resolved) {
        return {
          id: currentWarning.id,
          is_resolved: true,
          already_resolved: true,
          message: 'Cảnh báo này đã được xử lý từ trước',
          resolved_at: currentWarning.created_at,
        };
      }

      // Update warning to resolved
      const updatedWarning = await this.prisma.warningLog.update({
        where: { id: BigInt(warningId) },
        data: {
          is_resolved: true,
        },
      });

      this.logger.log(
        `Warning ${warningId} resolved${resolutionNote ? `: ${resolutionNote}` : ''}`,
      );

      return {
        id: updatedWarning.id,
        is_resolved: updatedWarning.is_resolved,
        already_resolved: false,
        message: 'Cảnh báo đã được xử lý thành công',
        resolved_at: new Date(),
        resolution_note: resolutionNote,
      };
    } catch (error) {
      this.logger.error(`Error resolving warning ${warningId}:`, error);
      throw error;
    }
  }

  /**
   * Get warnings for a specific student
   *
   * @param studentUserId - Student's user ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated list of student's warnings
   */
  async getStudentWarnings(
    studentUserId: bigint | number,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const skip = (page - 1) * limit;

      const warnings = await this.prisma.warningLog.findMany({
        where: {
          user_id: BigInt(studentUserId),
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      const total = await this.prisma.warningLog.count({
        where: {
          user_id: BigInt(studentUserId),
        },
      });

      return {
        data: warnings.map((w) => ({
          id: w.id,
          category: w.category,
          severity: w.severity,
          content: w.content,
          is_resolved: w.is_resolved,
          created_at: w.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting warnings for student ${studentUserId}:`,
        error,
      );
      throw error;
    }
  }
}
