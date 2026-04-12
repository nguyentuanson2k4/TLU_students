import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ServiceRequestService } from '../services';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  QueryStudentServiceRequestDto,
} from '../dto';
import { SERVICE_REQUEST_MESSAGES } from '../constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Service Requests')
@ApiBearerAuth()
@Controller('service-requests')
@UseGuards(JwtAuthGuard)
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo yêu cầu dịch vụ mới',
    description:
      'Sinh viên tạo một yêu cầu dịch vụ mới (ví dụ: xác nhận điểm, làm lại giấy tờ...)',
  })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu dịch vụ được tạo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Yêu cầu được tạo thành công',
        data: {
          id: 1,
          document_type_id: 1,
          student_id: 1,
          reason: 'Tôi cần xác nhận điểm',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không được xác thực' })
  async create(@Request() req, @Body() createDto: CreateServiceRequestDto) {
    const data = await this.serviceRequestService.create(
      req.user.id,
      createDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: SERVICE_REQUEST_MESSAGES.CREATE.SUCCESS,
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu dịch vụ của sinh viên',
    description:
      'Lấy danh sách tất cả yêu cầu dịch vụ của sinh viên đang đăng nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách yêu cầu dich vụ thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy danh sách yêu cầu dịch vụ thành công',
        data: [
          {
            id: 1,
            document_type_id: 1,
            student_id: 1,
            reason: 'Tôi cần xác nhận điểm',
            status: 0,
            created_at: '2026-04-12T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Không được xác thực' })
  async findAll(@Request() req, @Query() query: QueryStudentServiceRequestDto) {
    const { data, total } = await this.serviceRequestService.findAll(
      req.user.id,
      query,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách yêu cầu dịch vụ thành công',
      data,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'number', description: 'ID yêu cầu dịch vụ' })
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu dịch vụ',
    description: 'Lấy thông tin chi tiết của một yêu cầu dịch vụ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết yêu cầu dich vụ thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Lấy chi tiết yêu cầu dịch vụ thành công',
        data: {
          id: 1,
          document_type_id: 1,
          student_id: 1,
          reason: 'Tôi cần xác nhận điểm',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Không được xác thực' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.serviceRequestService.findOne(
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
  @ApiParam({ name: 'id', type: 'number', description: 'ID yêu cầu dịch vụ' })
  @ApiOperation({
    summary: 'Cập nhật yêu cầu dịch vụ',
    description:
      'Cập nhật thông tin yêu cầu dịch vụ (chỉ sinh viên đó có thể cập nhật)',
  })
  @ApiResponse({
    status: 200,
    description: 'Yêu cầu dịch vụ được cập nhật thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Yêu cầu được cập nhật thành công',
        data: {
          id: 1,
          document_type_id: 2,
          reason: 'Cập nhật lý do',
          status: 0,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không được xác thực' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestDto,
    @Request() req,
  ) {
    const data = await this.serviceRequestService.update(
      parseInt(id, 10),
      req.user.id,
      updateDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: SERVICE_REQUEST_MESSAGES.UPDATE.SUCCESS,
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: 'number', description: 'ID yêu cầu dịch vụ' })
  @ApiOperation({
    summary: 'Xóa yêu cầu dịch vụ',
    description: 'Xóa một yêu cầu dịch vụ (chỉ sinh viên đó có thể xóa)',
  })
  @ApiResponse({
    status: 204,
    description: 'Yêu cầu dịch vụ được xóa thành công',
  })
  @ApiResponse({ status: 401, description: 'Không được xác thực' })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.serviceRequestService.remove(parseInt(id, 10), req.user.id);
  }
}
