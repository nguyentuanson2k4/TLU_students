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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreatePostDto, UpdatePostDto, PostQueryDto } from './dto';

@ApiTags('Posts - Thông Báo Trong Lớp')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(private readonly postsService: PostsService) {}

  // ===================== CREATE POST =====================
  @Post()
  @Roles(Role.ADMIN, Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Tạo thông báo thành công')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'GV/Admin tạo thông báo mới trong lớp học phần',
    description:
      'Chỉ giảng viên của lớp đó hoặc admin mới có thể tạo thông báo',
  })
  @ApiResponse({
    status: 201,
    description: 'Thông báo được tạo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Tạo thông báo thành công',
        data: {
          id: '1',
          title: 'Thông báo về bài tập lớp này',
          content: 'Các bạn vui lòng nộp bài tập trước 5/5/2026',
          course_class_id: '1',
          author: {
            id: '5',
            username: 'gv001',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          media: [],
          interactions_count: 0,
          created_at: '2026-05-08T10:00:00Z',
          updated_at: '2026-05-08T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền - Bạn không dạy lớp này',
  })
  @ApiResponse({
    status: 404,
    description: 'Lớp học phần không tồn tại',
  })
  async createPost(@Body() createPostDto: CreatePostDto, @Request() req: any) {
    this.logger.log(
      `User ${req.user.username} creating post in class ${createPostDto.course_class_id}`,
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

  // ===================== GET POSTS BY CLASS =====================
  @Get('class/:classId')
  @ResponseMessage('Lấy danh sách thông báo thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của lớp học phần',
    description:
      'Sinh viên xem posts của lớp mình đã đăng ký, GV xem posts của lớp mình dạy',
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
              course_class_id: '1',
              author: {
                id: '5',
                username: 'gv001',
                avatar_url: null,
              },
              media: [],
              interactions_count: 2,
              created_at: '2026-05-08T10:00:00Z',
              updated_at: '2026-05-08T10:00:00Z',
            },
          ],
          total: 1,
          skip: 0,
          take: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền - Chưa đăng ký lớp hoặc không dạy lớp',
  })
  @ApiResponse({
    status: 404,
    description: 'Lớp học phần không tồn tại',
  })
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

  // ===================== GET POST DETAIL =====================
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
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem',
  })
  @ApiResponse({
    status: 404,
    description: 'Bài thông báo không tồn tại',
  })
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

  // ===================== GET MY POSTS =====================
  @Get('me/all')
  @Roles(Role.LECTURER)
  @UseGuards(RolesGuard)
  @ResponseMessage('Lấy danh sách thông báo của tôi thành công')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'GV lấy danh sách tất cả thông báo do mình tạo',
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
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
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

  // ===================== UPDATE POST =====================
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
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền cập nhật',
  })
  @ApiResponse({
    status: 404,
    description: 'Bài thông báo không tồn tại',
  })
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

  // ===================== DELETE POST =====================
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
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xóa',
  })
  @ApiResponse({
    status: 404,
    description: 'Bài thông báo không tồn tại',
  })
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
