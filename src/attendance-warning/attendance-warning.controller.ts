import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceWarningService } from './attendance-warning.service';
import { QueryAttendanceWarningDto, ResolveWarningDto } from './dto/attendance-warning-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Attendance Warnings')
@ApiBearerAuth()
@Controller('attendance-warnings')
export class AttendanceWarningController {
  constructor(
    private readonly attendanceWarningService: AttendanceWarningService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List all attendance warnings',
    description: 'Admin endpoint to retrieve all attendance warnings with optional filters and pagination. Supports filtering by severity, student code, and resolution status.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'severity',
    type: String,
    required: false,
    description: 'Filter by severity level: Low, Medium, High',
    example: 'High',
  })
  @ApiQuery({
    name: 'student_code',
    type: String,
    required: false,
    description: 'Filter by student code',
    example: 'HE123456',
  })
  @ApiQuery({
    name: 'is_resolved',
    type: Boolean,
    required: false,
    description: 'Filter by resolution status',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'List of warnings retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            user_id: 123,
            student_code: 'HE123456',
            student_name: 'Nguyễn Văn A',
            category: 'attendance',
            severity: 'High',
            content: 'Số buổi vắng: 8/40 (20%)',
            is_resolved: false,
            created_at: '2026-04-07T02:35:33Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          pages: 3,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid filters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - no token provided' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async getAllWarnings(@Query() query: QueryAttendanceWarningDto) {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);

      const filters: any = {};
      if (query.severity) filters.severity = query.severity;
      if (query.is_resolved !== undefined) filters.is_resolved = query.is_resolved;
      if (query.student_code) filters.student_code = query.student_code;

      const result = await this.attendanceWarningService.getAllWarnings(
        filters,
        page,
        limit,
      );

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to retrieve warnings',
      );
    }
  }

  /**
   * Get specific warning by ID (Admin only)
   * Retrieves detailed information about a specific warning
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Warning ID',
    example: '123',
  })
  @ApiOperation({
    summary: 'Get warning details by ID',
    description: 'Admin endpoint to retrieve detailed information about a specific warning by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Warning details retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 123,
          user_id: 456,
          student_code: 'HE123456',
          student_name: 'Nguyễn Văn A',
          category: 'attendance',
          severity: 'High',
          content: 'Số buổi vắng: 8/40 (20%)',
          is_resolved: false,
          created_at: '2026-04-07T02:35:33Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid warning ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no token provided',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - warning does not exist',
  })
  async getWarningById(@Param('id') warningId: string) {
    try {
      if (!warningId || isNaN(BigInt(warningId) as any)) {
        throw new BadRequestException('Invalid warning ID');
      }

      const warning = await this.attendanceWarningService.getWarningById(
        BigInt(warningId),
      );

      if (!warning) {
        throw new NotFoundException('Warning not found');
      }

      return {
        success: true,
        data: warning,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to retrieve warning',
      );
    }
  }

  /**
   * Resolve a warning (Admin only)
   * Marks a warning as resolved
   * Returns appropriate message if already resolved
   */
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Warning ID to resolve',
    example: '123',
  })
  @ApiOperation({
    summary: 'Resolve an attendance warning',
    description: 'Admin endpoint to mark a warning as resolved. If already resolved, returns appropriate message.',
  })
  @ApiResponse({
    status: 200,
    description: 'Warning resolved successfully or already resolved',
    schema: {
      example: {
        success: true,
        status: 'resolved',
        message: 'Cảnh báo đã được xử lý thành công',
        data: {
          warning_id: 123,
          is_resolved: true,
          resolved_at: '2026-04-07T02:35:33Z',
          resolution_note: 'Sinh viên đã cải thiện...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid warning ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no token provided',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - warning does not exist',
  })
  async resolveWarning(
    @Param('id') warningId: string,
    @Body() dto: ResolveWarningDto,
  ) {
    try {
      if (!warningId || isNaN(BigInt(warningId) as any)) {
        throw new BadRequestException('Invalid warning ID format');
      }

      const result = await this.attendanceWarningService.resolveWarning(
        BigInt(warningId),
        dto.resolution_note,
      );

      if (result.already_resolved) {
        return {
          success: true,
          status: 'already_resolved',
          message: result.message,
          data: {
            warning_id: result.id,
            is_resolved: result.is_resolved,
            resolved_at: result.resolved_at,
          },
        };
      }

      return {
        success: true,
        status: 'resolved',
        message: result.message,
        data: {
          warning_id: result.id,
          is_resolved: result.is_resolved,
          resolved_at: result.resolved_at,
          resolution_note: dto.resolution_note || null,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Warning not found`);
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to resolve warning',
      );
    }
  }

  /**
   * Get my warnings (Student endpoint)
   * Allows students to view their own attendance warnings
   * Returns paginated list of warnings
   */
  @Get('me/warnings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my attendance warnings',
    description: 'Student endpoint to retrieve their own attendance warnings with pagination',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Student warnings retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            category: 'attendance',
            severity: 'High',
            content: 'Số buổi vắng: 8/40 (20%)',
            is_resolved: false,
            created_at: '2026-04-07T02:35:33Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          pages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no token provided',
  })
  async getMyWarnings(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const userId = req.user?.id || req.user?.userId;
      
      if (!userId) {
        throw new ForbiddenException('User information not found');
      }

      const pageNum = Math.max(1, page || 1);
      const limitNum = Math.min(limit || 20, 100);

      const result = await this.attendanceWarningService.getStudentWarnings(
        userId,
        pageNum,
        limitNum,
      );

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to retrieve your warnings',
      );
    }
  }
}
