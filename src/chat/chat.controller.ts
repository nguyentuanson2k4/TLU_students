import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat RAG')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({ summary: 'Gửi tin nhắn và nhận câu trả lời từ AI' })
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    const userId = BigInt(req.user.id);
    return this.chatService.sendMessage(userId, dto);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Tạo phiên chat mới' })
  async createSession(@Req() req: any) {
    const userId = BigInt(req.user.id);
    return this.chatService.createSession(userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Lấy danh sách phiên chat' })
  async getSessions(@Req() req: any) {
    const userId = BigInt(req.user.id);
    return this.chatService.getSessions(userId);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Lấy tin nhắn trong phiên chat' })
  async getMessages(@Req() req: any, @Param('id') id: string) {
    const userId = BigInt(req.user.id);
    return this.chatService.getMessages(userId, BigInt(id));
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Xóa phiên chat' })
  async deleteSession(@Req() req: any, @Param('id') id: string) {
    const userId = BigInt(req.user.id);
    return this.chatService.deleteSession(userId, BigInt(id));
  }
}
