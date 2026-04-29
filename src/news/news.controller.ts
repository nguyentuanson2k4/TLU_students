import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreateNewsDto } from './dto/create-news.dto';

@ApiTags('News Management - Quản Lý Tin Tức')
@ApiBearerAuth()
@Controller('api/news')
@UseGuards(JwtAuthGuard)
export class NewsController {
  private readonly logger = new Logger(NewsController.name);

  constructor(private readonly newsService: NewsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ResponseMessage('Tin tức đã được gửi thành công')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo và gửi tin tức mới',
    description: 'Chỉ ADMIN có thể gửi tin tức',
  })
  @ApiResponse({
    status: 201,
    description: 'Tin tức đã được gửi thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Tin tức đã được gửi thành công',
        data: {
          message: 'Tin tức đã được gửi thành công',
          recipientCount: 150,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async createAndSendNews(
    @Body() createNewsDto: CreateNewsDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `User ${req.user.username} creating news: "${createNewsDto.title}"`,
    );

    return this.newsService.createAndSendNews(
      createNewsDto,
      req.user.userId || req.user.id,
    );
  }

  @Get()
  @ResponseMessage('Lấy danh sách tin tức thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách tin tức',
    description: 'Lấy danh sách tất cả tin tức đã gửi',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Trang số (mặc định: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Số bản ghi mỗi trang (mặc định: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tin tức thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách tin tức thành công',
        data: {
          data: [
            {
              id: 1,
              title: 'Thông báo lịch học lại',
              message: 'Từ ngày 1/5/2026, các lớp sẽ bắt đầu học lại...',
              created_at: '2026-04-25T10:00:00Z',
            },
          ],
          total: 10,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async getNews(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.newsService.getNews(page || 1, limit || 20);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ResponseMessage('Xóa tin tức thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa tin tức',
    description: 'Chỉ ADMIN có thể xóa tin tức',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của tin tức',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa tin tức thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Xóa tin tức thành công',
        data: {
          message: 'Tin tức đã được xóa',
        },
      },
    },
  })
  async deleteNews(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting news with ID: ${id}`);
    return this.newsService.deleteNews(id);
  }
}
