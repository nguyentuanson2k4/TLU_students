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
import { StudentServiceRequestsService } from '../services/student-service-requests.service';
import { CreateServiceRequestDto, QueryStudentServiceRequestDto } from '../dto';

@ApiTags('student/service-requests')
@ApiBearerAuth()
@Controller('student/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentServiceRequestsController {
  constructor(
    private readonly studentServiceRequestsService: StudentServiceRequestsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new service request' })
  @ApiResponse({
    status: 201,
    description: 'Service request created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Document type not found' })
  async create(@Request() req, @Body() createDto: CreateServiceRequestDto) {
    const data = await this.studentServiceRequestsService.createServiceRequest(
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
  @ApiOperation({ summary: 'Get all service requests for current student' })
  @ApiResponse({
    status: 200,
    description: 'Service requests retrieved successfully',
  })
  async findAll(@Request() req, @Query() query: QueryStudentServiceRequestDto) {
    const result = await this.studentServiceRequestsService.findAllByStudent(
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
  @ApiOperation({ summary: 'Get service request details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Service request details retrieved',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.studentServiceRequestsService.findOneByStudent(
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
