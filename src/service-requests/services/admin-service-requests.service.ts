import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryAdminServiceRequestDto,
  UpdateServiceRequestStatusDto,
} from '../dto';
import { ServiceRequestStatus } from '../enums';
import { ServiceRequestNotificationService } from './service-request-notification.service';

@Injectable()
export class AdminServiceRequestsService {
  private readonly logger = new Logger(AdminServiceRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: ServiceRequestNotificationService,
  ) {}

  /**
   * Get all service requests with filtering and pagination for admin
   * @param query - Query parameters (page, limit, status, document_type_id, student_code, full_name)
   * @returns List of all service requests with pagination info
   */
  async findAll(query: QueryAdminServiceRequestDto) {
    try {
      const page = parseInt(String(query.page), 10) || 1;
      const limit = parseInt(String(query.limit), 10) || 10;
      const skip = (page - 1) * limit;

      // Build where clause dynamically
      const where: any = {};

      // Filter by status - ensure it's a number
      if (query.status !== undefined && query.status !== null) {
        const status = parseInt(String(query.status), 10);
        if (!isNaN(status)) {
          where.status = status;
        }
      }

      // Filter by document type - ensure it's a BigInt
      if (
        query.document_type_id !== undefined &&
        query.document_type_id !== null
      ) {
        const docTypeId = parseInt(String(query.document_type_id), 10);
        if (!isNaN(docTypeId)) {
          where.document_type_id = BigInt(docTypeId);
        }
      }

      // Filter by student code and full name (need to join with student table)
      const studentWhereConditions: any = {};

      if (query.student_code) {
        studentWhereConditions.student_code = {
          contains: query.student_code,
          mode: 'insensitive',
        };
      }

      if (query.full_name) {
        studentWhereConditions.full_name = {
          contains: query.full_name,
          mode: 'insensitive',
        };
      }

      // If student filters are used, add to where condition
      if (Object.keys(studentWhereConditions).length > 0) {
        where.user = {
          student: studentWhereConditions,
        };
      }

      const [data, total] = await Promise.all([
        this.prisma.serviceRequest.findMany({
          where,
          include: {
            documentType: {
              select: {
                id: true,
                document_name: true,
                processing_days: true,
              },
            },
            user: {
              select: {
                id: true,
                student: {
                  select: {
                    id: true,
                    student_code: true,
                    full_name: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.serviceRequest.count({ where }),
      ]);

      this.logger.log(
        `Retrieved ${data.length} service requests for admin (total: ${total})`,
      );

      // Map response
      const mappedData = data.map((item) => ({
        id: item.id,
        reason: item.reason,
        status: item.status,
        created_at: item.created_at,
        attachment_url: item.attachment_url,
        documentType: {
          id: item.documentType?.id,
          document_name: item.documentType?.document_name,
          processing_days: item.documentType?.processing_days,
        },
        student: {
          id: item.user?.student?.id,
          student_code: item.user?.student?.student_code,
          full_name: item.user?.student?.full_name,
        },
      }));

      return {
        data: mappedData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve service requests for admin: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve service requests',
      );
    }
  }

  /**
   * Get a specific service request by ID for admin
   * @param id - Service request ID
   * @returns Service request details with document type and student info
   */
  async findOne(id: bigint | number) {
    try {
      const requestId = BigInt(id);

      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          documentType: {
            select: {
              id: true,
              document_name: true,
              processing_days: true,
            },
          },
          user: {
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  student_code: true,
                  full_name: true,
                  email: true,
                  class_name: true,
                },
              },
            },
          },
        },
      });

      if (!serviceRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      this.logger.log(`Retrieved service request ${id} for admin`);

      // Map response
      return {
        id: serviceRequest.id,
        reason: serviceRequest.reason,
        attachment_url: serviceRequest.attachment_url,
        status: serviceRequest.status,
        created_at: serviceRequest.created_at,
        documentType: {
          id: serviceRequest.documentType?.id,
          document_name: serviceRequest.documentType?.document_name,
          processing_days: serviceRequest.documentType?.processing_days,
        },
        student: {
          id: serviceRequest.user?.student?.id,
          student_code: serviceRequest.user?.student?.student_code,
          full_name: serviceRequest.user?.student?.full_name,
          email: serviceRequest.user?.student?.email,
          class_name: serviceRequest.user?.student?.class_name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to retrieve service request: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve service request',
      );
    }
  }

  /**
   * Update service request status with validation and notifications
   * @param id - Service request ID
   * @param updateDto - Status and optional message
   * @returns Updated service request
   */
  async updateStatus(
    id: bigint | number,
    updateDto: UpdateServiceRequestStatusDto,
  ) {
    try {
      const requestId = BigInt(id);
      const newStatus = updateDto.status;

      // Validate status value
      if (!Object.values(ServiceRequestStatus).includes(newStatus)) {
        throw new BadRequestException(
          'Invalid status. Accepted values: 1 (PENDING), 2 (PROCESSING), 3 (COMPLETED), 4 (REJECTED)',
        );
      }

      // Get current service request
      const currentRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              student: {
                select: {
                  full_name: true,
                },
              },
            },
          },
        },
      });

      if (!currentRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      // Validate status transition
      this.validateStatusTransition(currentRequest.status, newStatus);

      // Update service request
      const updatedRequest = await this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
        },
        include: {
          documentType: {
            select: {
              id: true,
              document_name: true,
              processing_days: true,
            },
          },
          user: {
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  student_code: true,
                  full_name: true,
                  email: true,
                  class_name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(
        `Service request ${id} status updated from ${currentRequest.status} to ${newStatus}`,
      );

      // Create notification for student
      await this.notificationService.notifyStatusChanged(
        currentRequest.user.id,
        requestId,
        newStatus,
        updateDto.message,
      );

      // Map response
      return {
        id: updatedRequest.id,
        reason: updatedRequest.reason,
        attachment_url: updatedRequest.attachment_url,
        status: updatedRequest.status,
        created_at: updatedRequest.created_at,
        documentType: {
          id: updatedRequest.documentType?.id,
          document_name: updatedRequest.documentType?.document_name,
          processing_days: updatedRequest.documentType?.processing_days,
        },
        student: {
          id: updatedRequest.user?.student?.id,
          student_code: updatedRequest.user?.student?.student_code,
          full_name: updatedRequest.user?.student?.full_name,
          email: updatedRequest.user?.student?.email,
          class_name: updatedRequest.user?.student?.class_name,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to update service request status: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to update service request status',
      );
    }
  }

  /**
   * Validate status transition rules
   * @param currentStatus - Current status
   * @param newStatus - New status to transition to
   */
  private validateStatusTransition(
    currentStatus: number,
    newStatus: number,
  ): void {
    // Cannot update if already completed
    if (currentStatus === ServiceRequestStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot update status of a completed service request',
      );
    }

    // Cannot update if already rejected
    if (currentStatus === ServiceRequestStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot update status of a rejected service request',
      );
    }

    // Validate allowed transitions
    const allowedTransitions: Record<number, number[]> = {
      [ServiceRequestStatus.PENDING]: [
        ServiceRequestStatus.PROCESSING,
        ServiceRequestStatus.REJECTED,
      ],
      [ServiceRequestStatus.PROCESSING]: [
        ServiceRequestStatus.COMPLETED,
        ServiceRequestStatus.REJECTED,
      ],
      [ServiceRequestStatus.COMPLETED]: [],
      [ServiceRequestStatus.REJECTED]: [],
    };

    const allowedStatuses = allowedTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      const statusNames: Record<number, string> = {
        [ServiceRequestStatus.PENDING]: 'PENDING',
        [ServiceRequestStatus.PROCESSING]: 'PROCESSING',
        [ServiceRequestStatus.COMPLETED]: 'COMPLETED',
        [ServiceRequestStatus.REJECTED]: 'REJECTED',
      };

      throw new BadRequestException(
        `Invalid status transition from ${statusNames[currentStatus]} to ${statusNames[newStatus]}. ` +
          `Allowed transitions: ${allowedStatuses.map((s) => statusNames[s]).join(', ')}`,
      );
    }
  }
}
