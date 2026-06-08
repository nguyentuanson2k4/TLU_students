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
   * - Chỉ cho phép xóa nếu tất cả service request đều có status 3 (Hoàn thành) hoặc 4 (Từ chối)
   * - Tự động xóa các service request hoàn thành/từ chối trước khi xóa document type
   * Status: 1=Chờ xử lý, 2=Đang xử lý, 3=Hoàn thành, 4=Từ chối, 5=Huỷ
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

    // Kiểm tra có yêu cầu dịch vụ chưa hoàn thành hoặc chưa từ chối
    const pendingRequests = await this.prisma.serviceRequest.findMany({
      where: {
        document_type_id: id,
        // Status != 3 (Completed) and != 4 (Rejected)
        status: {
          notIn: [3, 4],
        },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
      },
    });

    if (pendingRequests.length > 0) {
      const statusMap = {
        1: 'Chờ xử lý',
        2: 'Đang xử lý',
        5: 'Huỷ',
      };

      const statusDetails = pendingRequests
        .map(
          (req) =>
            `ID: ${req.id}, Trạng thái: ${statusMap[req.status] || 'Không rõ'}`,
        )
        .join('; ');

      this.logger.warn(
        `Document type with ID ${id} cannot be deleted due to ${pendingRequests.length} incomplete service requests`,
      );

      throw new BadRequestException({
        message: `Không thể xóa loại tài liệu này vì còn ${pendingRequests.length} yêu cầu dịch vụ chưa hoàn thành hoặc chưa được từ chối`,
        incompleteRequests: pendingRequests.length,
        details: statusDetails,
      });
    }

    // Xóa tất cả service request hoàn thành/từ chối trước khi xóa document type
    const deletedRequests = await this.prisma.serviceRequest.deleteMany({
      where: {
        document_type_id: id,
        status: {
          in: [3, 4],
        },
      },
    });

    this.logger.log(
      `Deleted ${deletedRequests.count} completed/rejected service requests for document type ${id}`,
    );

    await this.prisma.documentType.delete({
      where: { id },
    });

    this.logger.log(`Document type with ID ${id} deleted successfully`);
  }
}
