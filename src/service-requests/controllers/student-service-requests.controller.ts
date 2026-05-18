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
    summary: 'Tạo yêu cầu thủ tục 1 cửa mới',
    description:
      'Sinh viên gửi yêu cầu thủ tục (chỉ cần loại thủ tục muốn). Admin sẽ duyệt và gửi kết quả về dựa trên loại tài liệu.',
  })
  @ApiResponse({
    status: 201,
    description: 'Yêu cầu thủ tục được tạo thành công',
    schema: {
      example: {
        statusCode: 201,
        message: 'Yêu cầu dịch vụ được tạo thành công',
        data: {
          id: 1,
          document_type_id: 1,
          document_name: 'Giấy chứng chỉ điểm',
          processing_days: 3,
          status: 1,
          created_at: '2026-05-18T10:00:00Z',
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
            status: 1,
            created_at: '2026-05-18T10:00:00Z',
            documentType: {
              id: 1,
              document_name: 'Giấy chứng chỉ điểm',
              processing_days: 3,
            },
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
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
          status: 1,
          created_at: '2026-05-18T10:00:00Z',
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
}
