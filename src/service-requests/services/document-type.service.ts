import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DOCUMENT_TYPE_MESSAGES } from '../constants';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
} from '../../document-types/dto';

export interface DocumentTypeResponseDto {
  id: number;
  document_name: string;
  processing_days?: number;
}

@Injectable()
export class DocumentTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateDocumentTypeDto,
  ): Promise<DocumentTypeResponseDto> {
    // Check if document type with same name already exists
    const existing = await this.prisma.documentType.findFirst({
      where: {
        document_name: createDto.document_name,
      },
    });

    if (existing) {
      throw new BadRequestException(
        DOCUMENT_TYPE_MESSAGES.CREATE.ALREADY_EXISTS,
      );
    }

    const documentType = await this.prisma.documentType.create({
      data: {
        document_name: createDto.document_name,
        processing_days: createDto.processing_days,
      },
    });

    return this.mapToResponseDto(documentType);
  }

  async findAll(): Promise<DocumentTypeResponseDto[]> {
    const documentTypes = await this.prisma.documentType.findMany({
      orderBy: { document_name: 'asc' },
    });

    return documentTypes.map((item) => this.mapToResponseDto(item));
  }

  async findOne(id: number): Promise<DocumentTypeResponseDto> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      throw new NotFoundException(DOCUMENT_TYPE_MESSAGES.GET.NOT_FOUND);
    }

    return this.mapToResponseDto(documentType);
  }

  async update(
    id: number,
    updateDto: UpdateDocumentTypeDto,
  ): Promise<DocumentTypeResponseDto> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      throw new NotFoundException(DOCUMENT_TYPE_MESSAGES.UPDATE.NOT_FOUND);
    }

    // Check if new document name already exists
    if (updateDto.document_name) {
      const existing = await this.prisma.documentType.findFirst({
        where: {
          document_name: updateDto.document_name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          DOCUMENT_TYPE_MESSAGES.CREATE.ALREADY_EXISTS,
        );
      }
    }

    const updated = await this.prisma.documentType.update({
      where: { id },
      data: {
        ...(updateDto.document_name && {
          document_name: updateDto.document_name,
        }),
        ...(updateDto.processing_days !== undefined && {
          processing_days: updateDto.processing_days,
        }),
      },
    });

    return this.mapToResponseDto(updated);
  }

  async remove(id: number): Promise<void> {
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      throw new NotFoundException(DOCUMENT_TYPE_MESSAGES.DELETE.NOT_FOUND);
    }

    // Check if this document type is being used
    const usageCount = await this.prisma.serviceRequest.count({
      where: { document_type_id: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(DOCUMENT_TYPE_MESSAGES.DELETE.IN_USE);
    }

    await this.prisma.documentType.delete({
      where: { id },
    });
  }

  /**
   * Map document type to response DTO
   */
  private mapToResponseDto(documentType: any): DocumentTypeResponseDto {
    return {
      id: documentType.id,
      document_name: documentType.document_name,
      processing_days: documentType.processing_days,
    };
  }
}
