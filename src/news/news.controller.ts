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
  ApiBody,
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
    description:
      'Chỉ ADMIN có thể gửi tin tức tới các nhóm đối tượng khác nhau',
  })
  @ApiBody({
    type: CreateNewsDto,
    examples: {
      all_students: {
        summary: 'Gửi tới tất cả sinh viên',
        value: {
          title: 'Thông báo lịch học lại',
          content:
            'Từ ngày 1/5/2026, các lớp sẽ bắt đầu học lại tại các phòng máy theo lịch. Sinh viên vui lòng chuẩn bị tài liệu cần thiết.',
          recipient_type: 'all_students',
        },
      },
      by_class: {
        summary: 'Gửi tới lớp học phần cụ thể',
        value: {
          title: 'Nhắc nhở nộp bài tập',
          content:
            'Sinh viên lớp CNTT.KCS101 vui lòng nộp bài tập trước 5/5/2026.',
          recipient_type: 'by_class',
          recipient_ids: [1, 2, 3],
        },
      },
      by_faculty: {
        summary: 'Gửi tới khoa cụ thể',
        value: {
          title: 'Thông báo tuyển dụng',
          content: 'Khoa Công Nghệ Thông Tin tuyển dụng 20 sinh viên thực tập.',
          recipient_type: 'by_faculty',
          department_names: ['Khoa CNTT'],
        },
      },
      specific_users: {
        summary: 'Gửi tới người dùng cụ thể',
        value: {
          title: 'Mời tham gia sự kiện',
          content: 'Bạn được mời tham gia buổi hội thảo về AI vào ngày 10/5.',
          recipient_type: 'specific_users',
          recipient_ids: [100, 101, 102],
        },
      },
    },
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
    description:
      'Dữ liệu không hợp lệ (thiếu field bắt buộc, ID không tồn tại)',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (chỉ ADMIN mới được phép)',
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
    description: 'Lấy danh sách tất cả tin tức đã gửi (chỉ status PUBLISHED)',
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
              content:
                'Từ ngày 1/5/2026, các lớp sẽ bắt đầu học lại tại các phòng máy theo lịch. Sinh viên vui lòng chuẩn bị tài liệu cần thiết.',
              author_id: 1,
              recipient_type: 'all_students',
              recipient_ids: [10, 11, 12, 13, 14, 15],
              status: 'PUBLISHED',
              published_at: '2026-04-25T10:30:00Z',
              created_at: '2026-04-25T10:30:00Z',
              updated_at: '2026-04-25T10:30:00Z',
              author: {
                id: 1,
                username: 'admin',
                avatar_url: 'https://example.com/avatar.jpg',
                full_name: 'Nguyễn Văn A',
              },
            },
            {
              id: 2,
              title: 'Nhắc nhở nộp bài tập',
              content:
                'Sinh viên lớp CNTT.KCS101 vui lòng nộp bài tập trước 5/5/2026.',
              author_id: 1,
              recipient_type: 'by_class',
              recipient_ids: [1, 2, 3],
              status: 'PUBLISHED',
              published_at: '2026-04-24T14:00:00Z',
              created_at: '2026-04-24T14:00:00Z',
              updated_at: '2026-04-24T14:00:00Z',
              author: {
                id: 1,
                username: 'admin',
                avatar_url: 'https://example.com/avatar.jpg',
                full_name: 'Nguyễn Văn A',
              },
            },
          ],
          total: 25,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực (không có token hoặc token không hợp lệ)',
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
    description: 'Xóa một tin tức dựa trên ID (chỉ ADMIN có thể)',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID của tin tức cần xóa',
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
  @ApiResponse({
    status: 404,
    description: 'Tin tức không tồn tại',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền (chỉ ADMIN mới được phép)',
  })
  async deleteNews(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting news with ID: ${id}`);
    return this.newsService.deleteNews(id);
  }
}
