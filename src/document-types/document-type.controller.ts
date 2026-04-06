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
  @ApiOperation({ summary: 'Get all document types (public)' })
  @ApiResponse({
    status: 200,
    description: 'Document types retrieved successfully',
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
  @ApiOperation({ summary: 'Create a new document type' })
  @ApiResponse({
    status: 201,
    description: 'Document type created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate document name',
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
  @ApiOperation({ summary: 'Get all document types with pagination (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Document types retrieved successfully',
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
  @ApiOperation({ summary: 'Get document type details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document type retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Document type not found' })
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
  @ApiOperation({ summary: 'Update document type' })
  @ApiResponse({
    status: 200,
    description: 'Document type updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Document type not found' })
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
  @ApiOperation({ summary: 'Delete document type' })
  @ApiResponse({
    status: 204,
    description: 'Document type deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete document type in use',
  })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.documentTypeService.delete(id);
  }
}
