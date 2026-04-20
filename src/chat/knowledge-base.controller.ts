import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { KnowledgeBaseService } from './knowledge-base.service';

@ApiTags('Knowledge Base')
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Upload tài liệu vào knowledge base (Admin/Lecturer)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Vui lòng chọn file để upload');
    }
    return this.knowledgeBaseService.uploadDocument(file);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu' })
  async findAll() {
    return this.knowledgeBaseService.findAll();
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Xóa tài liệu (Admin/Lecturer)' })
  async remove(@Param('id') id: string) {
    return this.knowledgeBaseService.remove(BigInt(id));
  }
}
