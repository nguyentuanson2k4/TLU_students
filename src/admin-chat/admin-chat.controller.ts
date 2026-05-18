import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminChatService } from './admin-chat.service';
import {
  CreateAdminChatDto,
  SendAdminMessageDto,
  AdminChatQueryDto,
} from './dto';

@ApiTags('Admin Chat')
@Controller('admin-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminChatController {
  constructor(private readonly adminChatService: AdminChatService) {}

  // ===================== CONVERSATIONS =====================

  @Get('conversations')
  @ApiOperation({
    summary: 'Lấy danh sách chat admin-student',
    description:
      'Admin xem danh sách sinh viên đã chat. Sinh viên xem danh sách admin đã chat. Sắp xếp theo tin nhắn gần nhất.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách chat thành công',
    schema: {
      example: [
        {
          id: '1',
          partner: {
            id: '5',
            username: 'student001',
            fullName: 'Nguyễn Văn A',
            code: 'SV001',
            avatarUrl: null,
            role: 'STUDENT',
          },
          lastMessage: {
            id: '99',
            content: 'Admin ơi tôi có vấn đề...',
            messageType: 'TEXT',
            senderId: '5',
            isMe: false,
            createdAt: '2026-05-18T10:00:00Z',
          },
          unreadCount: 2,
          lastMessageAt: '2026-05-18T10:00:00Z',
        },
      ],
    },
  })
  async getAdminChats(@Req() req: any) {
    const userId = BigInt(req.user.id);
    const userRole = req.user.role;
    return this.adminChatService.getAdminChats(userId, userRole);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tạo hoặc lấy chat với admin/sinh viên',
    description:
      'Tìm conversation giữa admin và sinh viên, nếu chưa có thì tạo mới. Kiểm tra: một bên ADMIN, bên kia STUDENT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo/lấy chat thành công',
    schema: {
      example: {
        id: '1',
        partner: {
          id: '5',
          username: 'student001',
          fullName: 'Nguyễn Văn A',
          code: 'SV001',
          avatarUrl: null,
          role: 'STUDENT',
        },
        lastMessageAt: null,
      },
    },
  })
  async getOrCreateAdminChat(@Req() req: any, @Body() dto: CreateAdminChatDto) {
    const userId = BigInt(req.user.id);
    const userRole = req.user.role;
    return this.adminChatService.getOrCreateAdminChat(
      userId,
      userRole,
      BigInt(dto.targetUserId),
    );
  }

  // ===================== MESSAGES =====================

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Lấy tin nhắn trong chat admin-student',
    description:
      'Lấy tin nhắn với cursor-based pagination. Truyền cursor (ID tin nhắn cuối) để load thêm tin cũ. Tự động đánh dấu tin nhắn của người khác là đã đọc.',
  })
  @ApiParam({ name: 'id', description: 'ID chat', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Lấy tin nhắn thành công',
    schema: {
      example: {
        messages: [
          {
            id: '1',
            conversationId: '1',
            senderId: '5',
            senderName: 'Nguyễn Văn A',
            senderAvatar: null,
            senderRole: 'STUDENT',
            content: 'Admin ơi...',
            messageType: 'TEXT',
            mediaUrl: null,
            isRead: true,
            isMe: false,
            createdAt: '2026-05-18T09:00:00Z',
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
    @Query() query: AdminChatQueryDto,
  ) {
    const userId = BigInt(req.user.id);
    const userRole = req.user.role;
    const limit = query.limit ? parseInt(query.limit) : 30;

    return this.adminChatService.getMessages(
      userId,
      userRole,
      BigInt(conversationId),
      query.cursor,
      limit,
    );
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gửi tin nhắn trong chat admin-student',
    description:
      'Gửi tin nhắn text, ảnh, hoặc file. Cập nhật last_message_at của conversation.',
  })
  @ApiParam({ name: 'id', description: 'ID chat', example: '1' })
  @ApiResponse({
    status: 201,
    description: 'Gửi tin nhắn thành công',
    schema: {
      example: {
        id: '100',
        conversationId: '1',
        senderId: '4',
        senderName: 'Admin User',
        senderAvatar: null,
        senderRole: 'ADMIN',
        content: 'Vấn đề của bạn đã được giải quyết',
        messageType: 'TEXT',
        mediaUrl: null,
        isRead: false,
        createdAt: '2026-05-18T10:15:00Z',
      },
    },
  })
  async sendMessage(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body() dto: SendAdminMessageDto,
  ) {
    const userId = BigInt(req.user.id);
    return this.adminChatService.sendMessage(
      userId,
      BigInt(conversationId),
      dto.content,
      dto.messageType || 'TEXT',
      dto.mediaUrl,
    );
  }

  // ===================== ACTIONS =====================

  @Patch('conversations/:id/messages/read')
  @ApiOperation({
    summary: 'Đánh dấu tất cả tin nhắn là đã đọc',
    description: 'Đánh dấu tất cả tin nhắn từ người khác trong chat là đã đọc.',
  })
  @ApiParam({ name: 'id', description: 'ID chat', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu thành công',
    schema: {
      example: {
        updatedCount: 5,
      },
    },
  })
  async markAsRead(@Req() req: any, @Param('id') conversationId: string) {
    const userId = BigInt(req.user.id);
    return this.adminChatService.markMessagesAsRead(
      userId,
      BigInt(conversationId),
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Lấy số tin nhắn chưa đọc',
    description: 'Tính tổng số tin nhắn chưa đọc từ tất cả chat admin-student.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy số tin chưa đọc thành công',
    schema: {
      example: {
        totalUnread: 5,
      },
    },
  })
  async getUnreadCount(@Req() req: any) {
    const userId = BigInt(req.user.id);
    const userRole = req.user.role;
    return this.adminChatService.getUnreadCount(userId, userRole);
  }
}
