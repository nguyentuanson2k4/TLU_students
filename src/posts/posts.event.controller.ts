import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { PostsService } from './posts.service';

@Controller()
export class PostsEventController {
  private readonly logger = new Logger(PostsEventController.name);

  constructor(private readonly postsService: PostsService) {}

  @EventPattern('post_created_fanout')
  async handlePostCreated(
    @Payload() data: {
      postId: string;
      recipientUserIds: number[];
      title: string;
      content: string;
    },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.logger.log(`Nhận được Message từ RabbitMQ cho Post ID: ${data?.postId}`);

    try {
      // Gọi service xử lý ngầm (tạo DB, gửi Push FCM)
      await this.postsService.handlePostCreatedFanout(data);
      
      // Thành công -> Báo ACK để RabbitMQ xóa tin nhắn đi
      channel.ack(originalMsg);
      this.logger.log(`Đã gửi ACK (xác nhận hoàn thành) cho Post ID: ${data?.postId}`);
    } catch (error: any) {
      this.logger.error(`Lỗi trong Worker khi xử lý Post ID ${data?.postId}: ${error.message}`);
      
      // Xử lý thất bại -> Báo NACK. 
      // requeue = false để tránh lặp vô hạn nếu lỗi logic (lỗi DB). 
      // Nếu lỗi mạng, có thể cân nhắc đổi thành true để RabbitMQ thử lại.
      channel.nack(originalMsg, false, false); 
    }
  }
}
