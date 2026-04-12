import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DocumentTypeService } from './document-type.service';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  QueryDocumentTypeDto,
} from './dto';

@ApiTags('document-types')
@Controller('document-types')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  /**
   * Lấy danh sách loại tài liệu (công khai, không phân trang)
   * GET /document-types
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách loại tài liệu công khai',
    description:
      'Lấy danh sách tất cả loại tài liệu (công khai, không yêu cầu xác thực, không phân trang)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại tài liệu thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách loại tài liệu thành công',
        data: [
          { id: 1, document_name: 'Giấy chứng chỉ điểm', processing_days: 5 },
        ],
        total: 1,
      },
    },
  })
  async findAllPublic() {
    const data = await this.documentTypeService.findAllSimple();
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách loại tài liệu thành công',
      data,
      total: data.length,
    };
  }
}

@ApiTags('admin/document-types')
@ApiBearerAuth()
@Controller('admin/document-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  /**
   * Tạo loại tài liệu mới
   * POST /admin/document-types
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo loại tài liệu mới',
    description: 'Tạo một loại tài liệu mới với tên và số ngày xử lý',
  })
  @ApiResponse({
    status: 201,
    description: 'Loại tài liệu được tạo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Loại tài liệu được tạo thành công',
        data: {
          id: 1,
          document_name: 'Giấy chứng chỉ điểm',
          processing_days: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Input không hợp lệ hoặc tên tài liệu đã tồn tại',
  })
  async create(@Body() createDto: CreateDocumentTypeDto) {
    const data = await this.documentTypeService.create(createDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Loại tài liệu được tạo thành công',
      data,
    };
  }

  /**
   * Lấy danh sách loại tài liệu (quản trị, có phân trang)
   * GET /admin/document-types?page=1&limit=20
   */
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách loại tài liệu (quản trị)',
    description: 'Lấy danh sách loại tài liệu với phân trang (chỉ admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại tài liệu thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách loại tài liệu thành công',
        data: [
          { id: 1, document_name: 'Giấy chứng chỉ điểm', processing_days: 5 },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
    },
  })
  async findAll(@Query() query: QueryDocumentTypeDto) {
    const result = await this.documentTypeService.findAll(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách loại tài liệu thành công',
      ...result,
    };
  }

  /**
   * Lấy chi tiết loại tài liệu
   * GET /admin/document-types/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết loại tài liệu',
    description: 'Lấy thông tin chi tiết của một loại tài liệu theo ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết loại tài liệu thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy chi tiết loại tài liệu thành công',
        data: {
          id: 1,
          document_name: 'Giấy chứng chỉ điểm',
          processing_days: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Loại tài liệu không tìm thấy' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.documentTypeService.findById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết loại tài liệu thành công',
      data,
    };
  }

  /**
   * Cập nhật loại tài liệu
   * PATCH /admin/document-types/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật loại tài liệu',
    description: 'Cập nhật thông tin loại tài liệu theo ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Loại tài liệu được cập nhật thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Loại tài liệu được cập nhật thành công',
        data: { id: 1, document_name: 'Cập nhật tên', processing_days: 7 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Input không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Loại tài liệu không tìm thấy' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentTypeDto,
  ) {
    const data = await this.documentTypeService.update(id, updateDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Loại tài liệu được cập nhật thành công',
      data,
    };
  }

  /**
   * Xóa loại tài liệu
   * DELETE /admin/document-types/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa loại tài liệu',
    description: 'Xóa loại tài liệu theo ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Loại tài liệu được xóa thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa loại tài liệu hiện đang được sử dụng',
  })
  @ApiResponse({ status: 404, description: 'Loại tài liệu không tìm thấy' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.documentTypeService.delete(id);
  }
}
