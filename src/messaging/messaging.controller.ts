import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';

@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ===================== CONVERSATIONS =====================

  @Get('conversations')
  @ApiOperation({
    summary: 'Lấy danh sách hội thoại',
    description:
      'Lấy tất cả hội thoại của user, sắp xếp theo tin nhắn gần nhất. Kèm thông tin partner, tin nhắn cuối, số tin chưa đọc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hội thoại thành công',
    schema: {
      example: [
        {
          id: '1',
          partner: {
            id: '5',
            username: 'nguyenvana',
            fullName: 'Nguyễn Văn A',
            code: 'SV001',
            avatarUrl: null,
            role: 'STUDENT',
          },
          lastMessage: {
            id: '99',
            content: 'Bạn ơi cho mình hỏi...',
            messageType: 'TEXT',
            senderId: '5',
            isMe: false,
            createdAt: '2026-04-24T10:00:00Z',
          },
          unreadCount: 2,
          lastMessageAt: '2026-04-24T10:00:00Z',
        },
      ],
    },
  })
  async getConversations(@Req() req: any) {
    const userId = BigInt(req.user.id);
    return this.messagingService.getConversations(userId);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tạo hoặc lấy hội thoại với user khác',
    description:
      'Tìm conversation đã tồn tại giữa 2 user, nếu chưa có thì tạo mới.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo/lấy hội thoại thành công',
    schema: {
      example: {
        id: '1',
        partner: {
          id: '5',
          username: 'nguyenvana',
          fullName: 'Nguyễn Văn A',
          code: 'SV001',
          avatarUrl: null,
          role: 'STUDENT',
        },
        lastMessageAt: null,
      },
    },
  })
  async getOrCreateConversation(
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    const userId = BigInt(req.user.id);
    return this.messagingService.getOrCreateConversation(
      userId,
      BigInt(dto.targetUserId),
    );
  }

  // ===================== MESSAGES =====================

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Lấy tin nhắn trong hội thoại',
    description:
      'Lấy tin nhắn với cursor-based pagination. Truyền cursor (ID tin nhắn cuối) để load thêm tin cũ.',
  })
  @ApiParam({ name: 'id', description: 'ID hội thoại', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Lấy tin nhắn thành công',
    schema: {
      example: {
        messages: [
          {
            id: '1',
            conversationId: '1',
            senderId: '3',
            senderName: 'Nguyễn Văn A',
            senderAvatar: null,
            content: 'Xin chào!',
            messageType: 'TEXT',
            mediaUrl: null,
            isRead: true,
            isMe: false,
            createdAt: '2026-04-24T09:00:00Z',
          },
        ],
        hasMore: true,
        nextCursor: '1',
      },
    },
  })
  async getMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Query() query: MessageQueryDto,
  ) {
    const userId = BigInt(req.user.id);
    const limit = query.limit ? parseInt(query.limit) : 30;
    return this.messagingService.getMessages(
      userId,
      BigInt(conversationId),
      query.cursor,
      limit,
    );
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gửi tin nhắn (REST fallback)',
    description:
      'Gửi tin nhắn qua REST API. Nên dùng WebSocket cho real-time, API này là fallback.',
  })
  @ApiParam({ name: 'id', description: 'ID hội thoại', example: '1' })
  @ApiResponse({
    status: 201,
    description: 'Gửi tin nhắn thành công',
  })
  async sendMessage(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    const userId = BigInt(req.user.id);
    const result = await this.messagingService.sendMessage(
      userId,
      BigInt(conversationId),
      dto.content,
      dto.messageType || 'TEXT',
      dto.mediaUrl,
    );
    return result.message;
  }

  // ===================== READ RECEIPTS =====================

  @Patch('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu đã đọc',
    description:
      'Đánh dấu tất cả tin nhắn chưa đọc của đối phương trong hội thoại là đã đọc.',
  })
  @ApiParam({ name: 'id', description: 'ID hội thoại', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu đã đọc thành công',
    schema: {
      example: {
        conversationId: '1',
        readCount: 3,
        readBy: '5',
        senderId: '3',
      },
    },
  })
  async markAsRead(@Req() req: any, @Param('id') conversationId: string) {
    const userId = BigInt(req.user.id);
    return this.messagingService.markAsRead(userId, BigInt(conversationId));
  }

  // ===================== UNREAD COUNT =====================

  @Get('unread-count')
  @ApiOperation({
    summary: 'Lấy tổng số tin nhắn chưa đọc',
    description: 'Đếm tổng tất cả tin nhắn chưa đọc trên mọi hội thoại.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy số tin chưa đọc thành công',
    schema: { example: { totalUnread: 5 } },
  })
  async getUnreadCount(@Req() req: any) {
    const userId = BigInt(req.user.id);
    return this.messagingService.getUnreadCount(userId);
  }

  // ===================== DELETE MESSAGE =====================

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thu hồi tin nhắn',
    description:
      'Thu hồi (soft delete) tin nhắn. Chỉ người gửi mới có quyền thu hồi.',
  })
  @ApiParam({ name: 'id', description: 'ID tin nhắn', example: '99' })
  @ApiResponse({
    status: 200,
    description: 'Thu hồi tin nhắn thành công',
    schema: {
      example: {
        messageId: '99',
        conversationId: '1',
        message: 'Đã thu hồi tin nhắn',
      },
    },
  })
  async deleteMessage(@Req() req: any, @Param('id') messageId: string) {
    const userId = BigInt(req.user.id);
    return this.messagingService.deleteMessage(userId, BigInt(messageId));
  }

  // ===================== SEARCH USERS =====================

  @Get('users/search')
  @ApiOperation({
    summary: 'Tìm kiếm user để chat',
    description:
      'Tìm kiếm sinh viên/giảng viên theo tên, mã, hoặc email. Tối thiểu 2 ký tự.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Từ khóa tìm kiếm (tên, mã SV, email)',
    example: 'Nguyễn',
  })
  @ApiResponse({
    status: 200,
    description: 'Tìm kiếm thành công',
    schema: {
      example: [
        {
          userId: '5',
          fullName: 'Nguyễn Văn A',
          code: 'SV001',
          subtitle: 'CNTT01',
          avatarUrl: null,
          role: 'STUDENT',
        },
      ],
    },
  })
  async searchUsers(@Req() req: any, @Query('q') query: string) {
    const userId = BigInt(req.user.id);
    return this.messagingService.searchUsers(query, userId);
  }
}
