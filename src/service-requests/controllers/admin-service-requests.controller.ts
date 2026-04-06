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
import { AdminServiceRequestsService } from '../services/admin-service-requests.service';
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
    private readonly adminServiceRequestsService: AdminServiceRequestsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all service requests with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Service requests retrieved successfully',
  })
  async findAll(@Query() query: QueryAdminServiceRequestDto) {
    const result = await this.adminServiceRequestsService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Lấy danh sách yêu cầu dịch vụ thành công',
      ...result,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get service request details by ID for admin' })
  @ApiResponse({
    status: 200,
    description: 'Service request details retrieved',
  })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async findOne(@Param('id') id: string) {
    const data = await this.adminServiceRequestsService.findOne(
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
  @ApiOperation({ summary: 'Update service request status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRequestStatusDto,
  ) {
    const data = await this.adminServiceRequestsService.updateStatus(
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
