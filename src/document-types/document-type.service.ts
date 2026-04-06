import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  QueryDocumentTypeDto,
} from './dto';

@Injectable()
export class DocumentTypeService {
  private readonly logger = new Logger(DocumentTypeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo loại tài liệu mới
   */
  async create(createDto: CreateDocumentTypeDto) {
    this.logger.log(`Creating document type: ${createDto.document_name}`);

    // Kiểm tra name đã tồn tại
    const existing = await this.prisma.documentType.findFirst({
      where: {
        document_name: createDto.document_name,
      },
    });

    if (existing) {
      this.logger.warn(
        `Document type "${createDto.document_name}" already exists`,
      );
      throw new BadRequestException(
        `Loại tài liệu "${createDto.document_name}" đã tồn tại`,
      );
    }

    const documentType = await this.prisma.documentType.create({
      data: {
        document_name: createDto.document_name,
        processing_days: createDto.processing_days,
      },
    });

    this.logger.log(`Document type created with ID: ${documentType.id}`);
    return documentType;
  }

  /**
   * Lấy danh sách loại tài liệu (có phân trang)
   */
  async findAll(query: QueryDocumentTypeDto) {
    const page = parseInt(String(query.page), 10) || 1;
    const limit = parseInt(String(query.limit), 10) || 20;
    const skip = (page - 1) * limit;

    this.logger.log(`Fetching document types - page: ${page}, limit: ${limit}`);

    const [data, total] = await Promise.all([
      this.prisma.documentType.findMany({
        skip,
        take: limit,
        orderBy: { document_name: 'asc' },
      }),
      this.prisma.documentType.count(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy danh sách tất cả loại tài liệu (không phân trang)
   */
  async findAllSimple() {
    this.logger.log('Fetching all document types');

    return this.prisma.documentType.findMany({
      orderBy: { document_name: 'asc' },
    });
  }

  /**
   * Lấy chi tiết loại tài liệu theo ID
   */
  async findById(id: number) {
    this.logger.log(`Fetching document type with ID: ${id}`);

    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      this.logger.warn(`Document type with ID ${id} not found`);
      throw new NotFoundException(`Loại tài liệu với ID ${id} không tồn tại`);
    }

    return documentType;
  }

  /**
   * Cập nhật loại tài liệu
   */
  async update(id: number, updateDto: UpdateDocumentTypeDto) {
    this.logger.log(`Updating document type with ID: ${id}`);

    // Kiểm tra tồn tại
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      this.logger.warn(`Document type with ID ${id} not found`);
      throw new NotFoundException(`Loại tài liệu với ID ${id} không tồn tại`);
    }

    // Kiểm tra name không bị trùng (ngoại trừ chính nó)
    if (updateDto.document_name) {
      const existing = await this.prisma.documentType.findFirst({
        where: {
          document_name: updateDto.document_name,
          id: { not: id },
        },
      });

      if (existing) {
        this.logger.warn(
          `Document type "${updateDto.document_name}" already exists`,
        );
        throw new BadRequestException(
          `Loại tài liệu "${updateDto.document_name}" đã tồn tại`,
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

    this.logger.log(`Document type with ID ${id} updated successfully`);
    return updated;
  }

  /**
   * Xóa loại tài liệu
   */
  async delete(id: number) {
    this.logger.log(`Deleting document type with ID: ${id}`);

    // Kiểm tra tồn tại
    const documentType = await this.prisma.documentType.findUnique({
      where: { id },
    });

    if (!documentType) {
      this.logger.warn(`Document type with ID ${id} not found`);
      throw new NotFoundException(`Loại tài liệu với ID ${id} không tồn tại`);
    }

    // Kiểm tra có yêu cầu dịch vụ đang sử dụng
    const count = await this.prisma.serviceRequest.count({
      where: { document_type_id: id },
    });

    if (count > 0) {
      this.logger.warn(
        `Document type with ID ${id} is in use by ${count} service requests`,
      );
      throw new BadRequestException(
        `Không thể xóa loại tài liệu này vì đang được sử dụng bởi ${count} yêu cầu dịch vụ`,
      );
    }

    await this.prisma.documentType.delete({
      where: { id },
    });

    this.logger.log(`Document type with ID ${id} deleted successfully`);
  }
}
