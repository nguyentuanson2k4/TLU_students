import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
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
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreatePostDto, PostRecipientType } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';

@ApiTags('Posts - Quản Lý Thông Báo')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(private readonly postsService: PostsService) {}

  // ===================== TẠO THÔNG BÁO =====================
  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Tạo thông báo thành công')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo thông báo mới',
    description:
      'GV tạo thông báo cho lớp mình dạy (SPECIFIC_CLASSES). Admin có thể tạo thông báo cho toàn trường (ALL_STUDENTS), theo khoa (BY_DEPARTMENT), hoặc cho nhiều lớp.',
  })
  @ApiBody({
    type: CreatePostDto,
    examples: {
      class_post: {
        summary: 'GV gửi thông báo cho 1 lớp',
        value: {
          title: 'Thông báo về bài tập lớp này',
          content: 'Các bạn vui lòng nộp bài tập trước 5/5/2026',
          recipient_type: 'SPECIFIC_CLASSES',
          course_class_id: 1,
        },
      },
      all_students: {
        summary: 'Admin gửi thông báo toàn trường',
        value: {
          title: 'Thông báo lịch nghỉ lễ',
          content:
            'Toàn bộ sinh viên được nghỉ lễ từ ngày 30/4 đến hết ngày 1/5/2026.',
          recipient_type: 'ALL_STUDENTS',
        },
      },
      by_department: {
        summary: 'Admin gửi thông báo theo khoa',
        value: {
          title: 'Thông báo tuyển dụng thực tập',
          content:
            'Khoa CNTT tuyển dụng 20 sinh viên thực tập. Liên hệ văn phòng khoa để biết thêm chi tiết.',
          recipient_type: 'BY_DEPARTMENT',
          department_names: ['Khoa CNTT'],
        },
      },
      multi_class: {
        summary: 'Admin gửi cho nhiều lớp',
        value: {
          title: 'Nhắc nhở kiểm tra giữa kỳ',
          content: 'Sinh viên các lớp chuẩn bị kiểm tra giữa kỳ tuần tới.',
          recipient_type: 'SPECIFIC_CLASSES',
          recipient_ids: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Thông báo được tạo và gửi thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Tạo thông báo thành công',
        data: {
          id: '1',
          title: 'Thông báo về bài tập lớp này',
          content: 'Các bạn vui lòng nộp bài tập trước 5/5/2026',
          recipient_type: 'SPECIFIC_CLASSES',
          status: 'PUBLISHED',
          course_class_id: '1',
          author: {
            id: '5',
            username: 'gv001',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          media: [],
          recipientCount: 35,
          published_at: '2026-05-08T10:00:00Z',
          created_at: '2026-05-08T10:00:00Z',
          updated_at: '2026-05-08T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Lớp học phần không tồn tại' })
  async createPost(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    this.logger.log(
      `User ${req.user.username} creating post [${createPostDto.recipient_type}]`,
    );

    const data = await this.postsService.createPost(
      createPostDto,
      req.user.userId || req.user.id,
      req.user.role,
    );

    return {
      statusCode: 201,
      message: 'Tạo thông báo thành công',
      data,
    };
  }

  // ===================== THÔNG BÁO TOÀN TRƯỜNG =====================
  @Get('global')
  @ResponseMessage('Lấy danh sách thông báo toàn trường thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thông báo toàn trường',
    description:
      'Lấy danh sách thông báo dạng ALL_STUDENTS và BY_DEPARTMENT (đã published)',
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
    description: 'Lấy danh sách thông báo toàn trường thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách thông báo toàn trường thành công',
        data: {
          data: [
            {
              id: '1',
              title: 'Thông báo lịch nghỉ lễ',
              content: 'Toàn bộ sinh viên được nghỉ lễ...',
              recipient_type: 'ALL_STUDENTS',
              status: 'PUBLISHED',
              author: {
                id: '1',
                username: 'admin',
                avatar_url: null,
              },
              media: [],
              published_at: '2026-05-08T10:00:00Z',
            },
          ],
          total: 10,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async getGlobalPosts(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const data = await this.postsService.getGlobalPosts(
      page || 1,
      limit || 20,
    );

    return {
      statusCode: 200,
      message: 'Lấy danh sách thông báo toàn trường thành công',
      data,
    };
  }

  // ===================== BẢNG TIN CỦA SINH VIÊN =====================
  @Get('feed')
  @Roles(Role.STUDENT)
  @UseGuards(RolesGuard)
  @ResponseMessage('Lấy bảng tin thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bảng tin thông báo của sinh viên',
    description:
      'Lấy tất cả thông báo dành cho sinh viên hiện tại: toàn trường + theo khoa + theo lớp đã đăng ký',
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
    description: 'Lấy bảng tin thành công',
  })
  async getMyFeed(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Request() req?: any,
  ) {
    const data = await this.postsService.getMyFeed(
      req.user.userId || req.user.id,
      page || 1,
      limit || 20,
    );

    return {
      statusCode: 200,
      message: 'Lấy bảng tin thông báo thành công',
      data,
    };
  }

  // ===================== THÔNG BÁO THEO LỚP =====================
  @Get('class/:classId')
  @ResponseMessage('Lấy danh sách thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của lớp học phần',
    description:
      'SV xem posts của lớp mình đã đăng ký, GV xem posts của lớp mình dạy',
  })
  @ApiParam({
    name: 'classId',
    description: 'ID lớp học phần',
    example: 1,
  })
  @ApiQuery({
    name: 'skip',
    type: 'number',
    required: false,
    description: 'Số bản ghi bỏ qua (mặc định: 0)',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    type: 'number',
    required: false,
    description: 'Số bản ghi lấy (mặc định: 20, tối đa: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thông báo thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách thông báo thành công',
        data: {
          data: [
            {
              id: '1',
              title: 'Thông báo về bài tập',
              content: 'Nộp bài tập trước 5/5/2026',
              recipient_type: 'SPECIFIC_CLASSES',
              status: 'PUBLISHED',
              course_class_id: '1',
              author: {
                id: '5',
                username: 'gv001',
                avatar_url: null,
              },
              media: [],
            },
          ],
          total: 1,
          skip: 0,
          take: 20,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Không có quyền xem lớp này' })
  @ApiResponse({ status: 404, description: 'Lớp học phần không tồn tại' })
  async getPostsByClass(
    @Param('classId') classId: string,
    @Query() queryDto: PostQueryDto,
    @Request() req: any,
  ) {
    const skip = parseInt(queryDto.skip || '0');
    const take = parseInt(queryDto.take || '20');

    const data = await this.postsService.getPostsByClass(
      parseInt(classId),
      req.user.userId || req.user.id,
      req.user.role,
      skip,
      take,
    );

    return {
      statusCode: 200,
      message: 'Lấy danh sách thông báo thành công',
      data,
    };
  }

  // ===================== CHI TIẾT THÔNG BÁO =====================
  @Get(':id')
  @ResponseMessage('Lấy chi tiết thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy chi tiết một bài thông báo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID bài thông báo',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xem' })
  @ApiResponse({ status: 404, description: 'Bài thông báo không tồn tại' })
  async getPostDetail(@Param('id') id: string, @Request() req: any) {
    const data = await this.postsService.getPostDetail(
      parseInt(id),
      req.user.userId || req.user.id,
      req.user.role,
    );

    return {
      statusCode: 200,
      message: 'Lấy chi tiết thông báo thành công',
      data,
    };
  }

  // ===================== BÀI CỦA TÔI =====================
  @Get('me/all')
  @Roles(Role.LECTURER, Role.ADMIN)
  @UseGuards(RolesGuard)
  @ResponseMessage('Lấy danh sách thông báo của tôi thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'GV/Admin lấy danh sách tất cả thông báo do mình tạo',
  })
  @ApiQuery({
    name: 'skip',
    type: 'number',
    required: false,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    type: 'number',
    required: false,
    description: 'Số bản ghi lấy (tối đa: 100)',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getMyPosts(@Query() queryDto: PostQueryDto, @Request() req: any) {
    const skip = parseInt(queryDto.skip || '0');
    const take = parseInt(queryDto.take || '20');

    const data = await this.postsService.getMyPosts(
      req.user.userId || req.user.id,
      skip,
      take,
    );

    return {
      statusCode: 200,
      message: 'Lấy danh sách thông báo của tôi thành công',
      data,
    };
  }

  // ===================== CẬP NHẬT THÔNG BÁO =====================
  @Patch(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Cập nhật thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật thông báo',
    description: 'Chỉ tác giả hoặc admin mới có thể cập nhật',
  })
  @ApiParam({
    name: 'id',
    description: 'ID bài thông báo',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  @ApiResponse({ status: 404, description: 'Bài thông báo không tồn tại' })
  async updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req: any,
  ) {
    const data = await this.postsService.updatePost(
      parseInt(id),
      updatePostDto,
      req.user.userId || req.user.id,
      req.user.role,
    );

    return {
      statusCode: 200,
      message: 'Cập nhật thông báo thành công',
      data,
    };
  }

  // ===================== XÓA THÔNG BÁO =====================
  @Delete(':id')
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Xóa thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa thông báo',
    description: 'Chỉ tác giả hoặc admin mới có thể xóa',
  })
  @ApiParam({
    name: 'id',
    description: 'ID bài thông báo',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  @ApiResponse({ status: 404, description: 'Bài thông báo không tồn tại' })
  async deletePost(@Param('id') id: string, @Request() req: any) {
    const data = await this.postsService.deletePost(
      parseInt(id),
      req.user.userId || req.user.id,
      req.user.role,
    );

    return {
      statusCode: 200,
      message: 'Xóa thông báo thành công',
      data,
    };
  }
}
