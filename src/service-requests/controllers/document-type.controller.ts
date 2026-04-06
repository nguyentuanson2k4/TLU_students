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
} from '@nestjs/common';
import { DocumentTypeService } from '../services';
import { DOCUMENT_TYPE_MESSAGES } from '../constants';

interface CreateDocumentTypeDto {
  document_name: string;
  processing_days?: number;
}

interface UpdateDocumentTypeDto {
  document_name?: string;
  processing_days?: number;
}

@Controller('document-types')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  @Post()
  async create(@Body() createDto: CreateDocumentTypeDto) {
    const data = await this.documentTypeService.create(createDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: DOCUMENT_TYPE_MESSAGES.CREATE.SUCCESS,
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.documentTypeService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách loại tài liệu thành công',
      data,
      total: data.length,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.documentTypeService.findOne(parseInt(id, 10));
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết loại tài liệu thành công',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentTypeDto,
  ) {
    const data = await this.documentTypeService.update(
      parseInt(id, 10),
      updateDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: DOCUMENT_TYPE_MESSAGES.UPDATE.SUCCESS,
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.documentTypeService.remove(parseInt(id, 10));
  }
}
