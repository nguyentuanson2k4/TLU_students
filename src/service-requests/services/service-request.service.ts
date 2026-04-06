import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  QueryStudentServiceRequestDto,
  ServiceRequestResponseDto,
} from '../dto';
import { ServiceRequestStatus } from '../enums';
import {
  SERVICE_REQUEST_MESSAGES,
  MAX_ATTACHMENT_SIZE,
  ALLOWED_ATTACHMENT_MIME_TYPES,
} from '../constants';

@Injectable()
export class ServiceRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    createDto: CreateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    // Verify document type exists
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: createDto.document_type_id },
    });

    if (!documentType) {
      throw new BadRequestException(
        SERVICE_REQUEST_MESSAGES.CREATE.INVALID_DOCUMENT_TYPE,
      );
    }

    // Validate attachment if provided
    if (createDto.attachment_url) {
      this.validateAttachment(createDto.attachment_url);
    }

    const serviceRequest = await this.prisma.serviceRequest.create({
      data: {
        user_id: userId,
        document_type_id: createDto.document_type_id,
        reason: createDto.reason,
        attachment_url: createDto.attachment_url,
        status: ServiceRequestStatus.PENDING,
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

    return this.mapToResponseDto(serviceRequest);
  }

  async findAll(
    userId: number,
    query: QueryStudentServiceRequestDto,
  ): Promise<{ data: ServiceRequestResponseDto[]; total: number }> {
    const page = parseInt(String(query.page), 10) || 1;
    const limit = parseInt(String(query.limit), 10) || 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: {
          user_id: userId,
          ...(query.status && { status: query.status }),
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
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.serviceRequest.count({
        where: {
          user_id: userId,
          ...(query.status && { status: query.status }),
        },
      }),
    ]);

    return {
      data: data.map((item) => this.mapToResponseDto(item)),
      total,
    };
  }

  async findOne(
    id: number,
    userId: number,
  ): Promise<ServiceRequestResponseDto> {
    const serviceRequest = await this.prisma.serviceRequest.findUnique({
      where: { id },
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
      throw new NotFoundException(SERVICE_REQUEST_MESSAGES.GET.NOT_FOUND);
    }

    // Check if user owns this request
    if (serviceRequest.user_id !== BigInt(userId)) {
      throw new ForbiddenException(SERVICE_REQUEST_MESSAGES.GET.FORBIDDEN);
    }

    return this.mapToResponseDto(serviceRequest);
  }

  async update(
    id: number,
    userId: number,
    updateDto: UpdateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    const serviceRequest = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException(SERVICE_REQUEST_MESSAGES.UPDATE.NOT_FOUND);
    }

    // Check if user owns this request
    if (serviceRequest.user_id !== BigInt(userId)) {
      throw new ForbiddenException(SERVICE_REQUEST_MESSAGES.UPDATE.FORBIDDEN);
    }

    // Only allow updating PENDING requests
    if (serviceRequest.status !== ServiceRequestStatus.PENDING) {
      throw new BadRequestException(
        SERVICE_REQUEST_MESSAGES.UPDATE.INVALID_STATUS_TRANSITION,
      );
    }

    // Verify document type if provided
    if (updateDto.document_type_id) {
      const documentType = await this.prisma.documentType.findUnique({
        where: { id: updateDto.document_type_id },
      });

      if (!documentType) {
        throw new BadRequestException(
          SERVICE_REQUEST_MESSAGES.CREATE.INVALID_DOCUMENT_TYPE,
        );
      }
    }

    // Validate attachment if provided
    if (updateDto.attachment_url) {
      this.validateAttachment(updateDto.attachment_url);
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        ...(updateDto.document_type_id && {
          document_type_id: updateDto.document_type_id,
        }),
        ...(updateDto.reason !== undefined && { reason: updateDto.reason }),
        ...(updateDto.attachment_url !== undefined && {
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

    return this.mapToResponseDto(updated);
  }

  async remove(id: number, userId: number): Promise<void> {
    const serviceRequest = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException(SERVICE_REQUEST_MESSAGES.DELETE.NOT_FOUND);
    }

    // Check if user owns this request
    if (serviceRequest.user_id !== BigInt(userId)) {
      throw new ForbiddenException(SERVICE_REQUEST_MESSAGES.DELETE.FORBIDDEN);
    }

    // Only allow deleting PENDING requests
    if (serviceRequest.status !== ServiceRequestStatus.PENDING) {
      throw new BadRequestException(
        SERVICE_REQUEST_MESSAGES.UPDATE.INVALID_STATUS_TRANSITION,
      );
    }

    await this.prisma.serviceRequest.delete({
      where: { id },
    });
  }

  /**
   * Validate attachment file size and type
   */
  private validateAttachment(attachmentUrl: string): void {
    // In production, you would validate the actual file
    // This is a placeholder for the validation logic
    // You might integrate with file storage service (S3, etc.)
    // Example: Check if file exists and validate MIME type
    // For now, provide guidance on how this should work
  }

  /**
   * Map service request to response DTO
   */
  private mapToResponseDto(serviceRequest: any): ServiceRequestResponseDto {
    return {
      id: serviceRequest.id,
      user_id: serviceRequest.user_id,
      document_type_id: serviceRequest.document_type_id,
      reason: serviceRequest.reason,
      attachment_url: serviceRequest.attachment_url,
      status: serviceRequest.status,
      created_at: serviceRequest.created_at,
      document_type: serviceRequest.documentType,
    };
  }
}
