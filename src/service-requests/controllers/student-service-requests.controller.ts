import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ServiceRequestsService } from '../service-requests.service';
import {
  CreateServiceRequestDto,
  QueryStudentServiceRequestDto,
  UpdateServiceRequestDto,
} from '../dto';

@ApiTags('student/service-requests')
@ApiBearerAuth()
@Controller('student/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo yêu cầu dịch vụ mới',
    description:
      'Sinh viên tạo một yêu cầu dịch vụ mới (xác nhận điểm, làm giấy tờ...)',
  })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu dịch vụ được tạo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Yêu cầu dịch vụ được tạo thành công',
        data: {
          id: 1,
          document_type_id: 1,
          student_id: 1,
          reason: 'Tôi cần xác nhận điểm để làm hồ sơ du học',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Loại tài liệu không tìm thấy' })
  async create(@Request() req, @Body() createDto: CreateServiceRequestDto) {
    const data = await this.serviceRequestsService.createServiceRequest(
      req.user.id,
      createDto,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Yêu cầu dịch vụ được tạo thành công',
      data,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu dịch vụ của sinh viên',
    description:
      'Lấy danh sách tất cả yêu cầu dịch vụ của sinh viên đang đăng nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách yêu cầu dịch vụ thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách yêu cầu dịch vụ thành công',
        data: [
          {
            id: 1,
            document_type: 'Giấy chứng chỉ điểm',
            reason: 'Tôi cần xác nhận điểm',
            status: 0,
            created_at: '2026-04-12T10:00:00Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
      },
    },
  })
  async findAll(@Request() req, @Query() query: QueryStudentServiceRequestDto) {
    const result = await this.serviceRequestsService.findAllByStudent(
      req.user.id,
      query,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách yêu cầu dịch vụ thành công',
      ...result,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu dịch vụ của sinh viên',
    description:
      'Lấy thông tin chi tiết một yêu cầu dịch vụ (chỉ xem của chính mình)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết yêu cầu dịch vụ thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy chi tiết yêu cầu dịch vụ thành công',
        data: {
          id: 1,
          document_type: 'Giấy chứng chỉ điểm',
          reason: 'Tôi cần xác nhận điểm để làm hồ sơ du học',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.serviceRequestsService.findOneByStudent(
      parseInt(id, 10),
      req.user.id,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết yêu cầu dịch vụ thành công',
      data,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật yêu cầu dịch vụ',
    description:
      'Cập nhật thông tin yêu cầu dịch vụ (chỉ PENDING requests có thể sửa)',
  })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu dịch vụ được cập nhật thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Yêu cầu dịch vụ được cập nhật thành công',
        data: {
          id: 1,
          reason: 'Cập nhật lý do',
          attachment_url: 'https://example.com/new-file.pdf',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc request không thể sửa',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestDto,
    @Request() req,
  ) {
    const data = await this.serviceRequestsService.updateServiceRequest(
      parseInt(id, 10),
      req.user.id,
      updateDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Yêu cầu dịch vụ được cập nhật thành công',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa yêu cầu dịch vụ',
    description: 'Xóa yêu cầu dịch vụ (chỉ PENDING requests có thể xóa)',
  })
  @ApiResponse({
    status: 204,
    description: 'Yêu cầu dịch vụ được xóa thành công',
  })
  @ApiResponse({ status: 400, description: 'Request không thể xóa' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.serviceRequestsService.deleteServiceRequest(
      parseInt(id, 10),
      req.user.id,
    );
  }
}
