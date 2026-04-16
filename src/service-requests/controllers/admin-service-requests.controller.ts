import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
  QueryAdminServiceRequestDto,
  UpdateServiceRequestStatusDto,
} from '../dto';

@ApiTags('admin/service-requests')
@ApiBearerAuth()
@Controller('admin/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu dịch vụ (quản lý)',
    description:
      'Lấy danh sách tất cả yêu cầu dịch vụ với bộ lọc và phân trang (chỉ admin)',
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
            student_code: 'HE123456',
            full_name: 'Nguyễn Văn A',
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
  async findAll(@Query() query: QueryAdminServiceRequestDto) {
    const result = await this.serviceRequestsService.findAllAdmin(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách yêu cầu dịch vụ thành công',
      ...result,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu dịch vụ (admin)',
    description: 'Lấy thông tin chi tiết một yêu cầu dịch vụ',
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
          student_code: 'HE123456',
          full_name: 'Nguyễn Văn A',
          document_type: 'Giấy chứng chỉ điểm',
          reason: 'Tôi cần xác nhận điểm',
          status: 0,
          created_at: '2026-04-12T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async findOne(@Param('id') id: string) {
    const data = await this.serviceRequestsService.findOneAdmin(
      parseInt(id, 10),
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy chi tiết yêu cầu dịch vụ thành công',
      data,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật trạng thái yêu cầu dịch vụ',
    description: 'Duyệt hoặc từ chối yêu cầu dịch vụ từ sinh viên',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái yêu cầu dịch vụ thành công',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cập nhật trạng thái yêu cầu dịch vụ thành công',
        data: { id: 1, status: 1, updated_at: '2026-04-12T11:00:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Chuyển đổi trạng thái không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Yêu cầu dịch vụ không tìm thấy' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestStatusDto,
  ) {
    const data = await this.serviceRequestsService.updateStatus(
      parseInt(id, 10),
      updateDto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Cập nhật trạng thái yêu cầu dịch vụ thành công',
      data,
    };
  }
}
