import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceRequestDto, QueryStudentServiceRequestDto } from '../dto';
import { ServiceRequestNotificationService } from './service-request-notification.service';

@Injectable()
export class StudentServiceRequestsService {
  private readonly logger = new Logger(StudentServiceRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: ServiceRequestNotificationService,
  ) {}

  /**
   * Create a new service request for a student
   * @param userId - Current student user ID
   * @param createDto - Service request data
   * @returns Created service request with document type details
   */
  async createServiceRequest(
    userId: bigint | number,
    createDto: CreateServiceRequestDto,
  ) {
    try {
      const userIdBigInt = BigInt(userId);
      const documentTypeId = BigInt(createDto.document_type_id);

      // Verify document type exists
      const documentType = await this.prisma.documentType.findUnique({
        where: { id: documentTypeId },
      });

      if (!documentType) {
        throw new NotFoundException(
          `Document type with ID ${createDto.document_type_id} not found`,
        );
      }

      // Create service request
      const serviceRequest = await this.prisma.serviceRequest.create({
        data: {
          user_id: userIdBigInt,
          document_type_id: documentTypeId,
          reason: createDto.reason,
          attachment_url: createDto.attachment_url || null,
          status: 1, // PENDING
        },
        include: {
          documentType: {
            select: {
              id: true,
              document_name: true,
              processing_days: true,
            },
          },
        },
      });

      this.logger.log(
        `Service request created: ID ${serviceRequest.id} for user ${userId}`,
      );

      // Create notification for student
      await this.notificationService.notifyCreated(
        userIdBigInt,
        serviceRequest.id,
      );

      return {
        id: serviceRequest.id,
        user_id: serviceRequest.user_id,
        document_type_id: serviceRequest.document_type_id,
        document_name: serviceRequest.documentType?.document_name,
        processing_days: serviceRequest.documentType?.processing_days,
        reason: serviceRequest.reason,
        attachment_url: serviceRequest.attachment_url,
        status: serviceRequest.status,
        created_at: serviceRequest.created_at,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to create service request: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to create service request',
      );
    }
  }

  /**
   * Get all service requests for a specific student with pagination and filtering
   * @param userId - Current student user ID
   * @param query - Query parameters (page, limit, status)
   * @returns List of service requests with pagination info
   */
  async findAllByStudent(
    userId: bigint | number,
    query: QueryStudentServiceRequestDto,
  ) {
    try {
      const userIdBigInt = BigInt(userId);
      const page = parseInt(String(query.page), 10) || 1;
      const limit = parseInt(String(query.limit), 10) || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        user_id: userIdBigInt,
      };

      // Handle status filter - ensure it's a number
      if (query.status !== undefined && query.status !== null) {
        const status = parseInt(String(query.status), 10);
        if (!isNaN(status)) {
          where.status = status;
        }
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
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.serviceRequest.count({ where }),
      ]);

      this.logger.log(
        `Retrieved ${data.length} service requests for user ${userId}`,
      );

      // Map response
      const mappedData = data.map((item) => ({
        id: item.id,
        reason: item.reason,
        attachment_url: item.attachment_url,
        status: item.status,
        created_at: item.created_at,
        documentType: {
          id: item.documentType?.id,
          document_name: item.documentType?.document_name,
          processing_days: item.documentType?.processing_days,
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
        `Failed to retrieve service requests: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve service requests',
      );
    }
  }

  /**
   * Get a specific service request by ID and student ID
   * @param id - Service request ID
   * @param userId - Current student user ID
   * @returns Service request details
   */
  async findOneByStudent(id: bigint | number, userId: bigint | number) {
    try {
      const requestId = BigInt(id);
      const userIdBigInt = BigInt(userId);

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
        },
      });

      if (!serviceRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      // Check ownership
      if (serviceRequest.user_id !== userIdBigInt) {
        throw new ForbiddenException(
          'You do not have permission to access this service request',
        );
      }

      this.logger.log(`Retrieved service request ${id} for user ${userId}`);

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
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
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
}
