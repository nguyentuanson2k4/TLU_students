import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  QueryStudentServiceRequestDto,
} from './dto';
import { ServiceRequestNotificationService } from './service-request-notification.service';

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: ServiceRequestNotificationService,
  ) {}

  // ============== STUDENT METHODS ==============

  /**
   * Create a new service request for a student
   * Student only needs to send document_type_id
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
          reason: null,
          attachment_url: null,
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
   * Get all service requests for a specific student
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

      // Handle status filter
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

      const mappedData = data.map((item) => ({
        id: item.id,
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
   * Get a specific service request by student ID
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

  /**
   * Update a service request (only PENDING)
   */
  async updateServiceRequest(
    id: bigint | number,
    userId: bigint | number,
    updateDto: UpdateServiceRequestDto,
  ) {
    try {
      const requestId = BigInt(id);
      const userIdBigInt = BigInt(userId);

      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!serviceRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      // Check ownership
      if (serviceRequest.user_id !== userIdBigInt) {
        throw new ForbiddenException(
          'You do not have permission to update this service request',
        );
      }

      // Only allow updating PENDING requests
      if (serviceRequest.status !== 1) {
        throw new BadRequestException(
          'Can only update requests with PENDING status',
        );
      }

      // Verify document type if provided
      if (updateDto.document_type_id) {
        const documentType = await this.prisma.documentType.findUnique({
          where: { id: BigInt(updateDto.document_type_id) },
        });

        if (!documentType) {
          throw new BadRequestException('Document type not found');
        }
      }

      const updated = await this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: {
          ...(updateDto.document_type_id && {
            document_type_id: BigInt(updateDto.document_type_id),
          }),
          ...(updateDto.reason && { reason: updateDto.reason }),
          ...(updateDto.attachment_url && {
            attachment_url: updateDto.attachment_url,
          }),
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

      this.logger.log(`Updated service request ${id} for user ${userId}`);

      return {
        id: updated.id,
        reason: updated.reason,
        attachment_url: updated.attachment_url,
        status: updated.status,
        created_at: updated.created_at,
        documentType: {
          id: updated.documentType?.id,
          document_name: updated.documentType?.document_name,
          processing_days: updated.documentType?.processing_days,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to update service request: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to update service request',
      );
    }
  }

  /**
   * Delete a service request (only PENDING)
   */
  async deleteServiceRequest(
    id: bigint | number,
    userId: bigint | number,
  ): Promise<void> {
    try {
      const requestId = BigInt(id);
      const userIdBigInt = BigInt(userId);

      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!serviceRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      // Check ownership
      if (serviceRequest.user_id !== userIdBigInt) {
        throw new ForbiddenException(
          'You do not have permission to delete this service request',
        );
      }

      // Only allow deleting PENDING requests
      if (serviceRequest.status !== 1) {
        throw new BadRequestException(
          'Can only delete requests with PENDING status',
        );
      }

      await this.prisma.serviceRequest.delete({
        where: { id: requestId },
      });

      this.logger.log(`Deleted service request ${id} for user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to delete service request: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to delete service request',
      );
    }
  }

  // ============== ADMIN METHODS ==============

  /**
   * Get all service requests with filtering and pagination for admin
   */
  async findAllAdmin(query: any) {
    try {
      const page = parseInt(String(query.page), 10) || 1;
      const limit = parseInt(String(query.limit), 10) || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Filter by status
      if (query.status !== undefined && query.status !== null) {
        const status = parseInt(String(query.status), 10);
        if (!isNaN(status)) {
          where.status = status;
        }
      }

      // Filter by document type
      if (
        query.document_type_id !== undefined &&
        query.document_type_id !== null
      ) {
        where.document_type_id = BigInt(query.document_type_id);
      }

      // Filter by full name
      if (query.full_name) {
        where.user = {
          student: {
            full_name: {
              contains: query.full_name,
              mode: 'insensitive',
            },
          },
        };
      }

      const [data, total] = await Promise.all([
        this.prisma.serviceRequest.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                student: {
                  select: {
                    student_code: true,
                    full_name: true,
                  },
                },
              },
            },
            documentType: {
              select: {
                id: true,
                document_name: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.serviceRequest.count({ where }),
      ]);

      this.logger.log(`Admin retrieved ${data.length} service requests`);

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve admin service requests: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve service requests',
      );
    }
  }

  /**
   * Get a specific service request for admin view
   */
  async findOneAdmin(id: bigint | number) {
    try {
      const requestId = BigInt(id);

      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              student: {
                select: {
                  student_code: true,
                  full_name: true,
                  email: true,
                },
              },
            },
          },
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

      this.logger.log(`Admin retrieved service request ${id}`);

      return serviceRequest;
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
   * Update service request status (admin only)
   */
  async updateStatus(id: bigint | number, updateDto: any) {
    try {
      const requestId = BigInt(id);

      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!serviceRequest) {
        throw new NotFoundException(`Service request with ID ${id} not found`);
      }

      const updated = await this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: updateDto.status,
        },
        include: {
          user: {
            select: {
              id: true,
              student: {
                select: {
                  student_code: true,
                  full_name: true,
                },
              },
            },
          },
          documentType: {
            select: {
              id: true,
              document_name: true,
            },
          },
        },
      });

      this.logger.log(`Admin updated status of service request ${id}`);

      // Notify user about status update
      await this.notificationService.notifyStatusChanged(
        updated.user_id,
        updated.id,
        updated.status,
      );

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
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
}
