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
import { ServiceRequestService } from '../services';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  QueryStudentServiceRequestDto,
} from '../dto';
import { SERVICE_REQUEST_MESSAGES } from '../constants';

@Controller('service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
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
  async remove(@Param('id') id: string, @Request() req) {
    await this.serviceRequestService.remove(parseInt(id, 10), req.user.id);
  }
}
