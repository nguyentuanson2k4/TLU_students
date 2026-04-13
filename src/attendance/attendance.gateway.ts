import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/attendance',
  cors: {
    origin: '*',
  },
})
export class AttendanceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttendanceGateway.name);

  // ===================== CONNECTION LIFECYCLE =====================

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ===================== CLIENT EVENTS =====================

  /**
   * Giáo viên join vào phòng của buổi điểm danh để nhận cập nhật realtime.
   * Client gửi: socket.emit('joinSession', { sessionId: '22' })
   */
  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session_${data.sessionId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} joined room ${room}`,
    );
    client.emit('joinedSession', {
      sessionId: data.sessionId,
      message: `Đã tham gia phòng điểm danh buổi ${data.sessionId}`,
    });
  }

  /**
   * Giáo viên rời phòng của buổi điểm danh.
   * Client gửi: socket.emit('leaveSession', { sessionId: '22' })
   */
  @SubscribeMessage('leaveSession')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session_${data.sessionId}`;
    client.leave(room);
    this.logger.log(
      `Client ${client.id} left room ${room}`,
    );
    client.emit('leftSession', {
      sessionId: data.sessionId,
      message: `Đã rời phòng điểm danh buổi ${data.sessionId}`,
    });
  }

  // ===================== INTERNAL EVENT HANDLERS =====================

  /**
   * Lắng nghe sự kiện nội bộ khi có bản ghi điểm danh mới.
   * Được phát ra từ AttendanceService hoặc FaceRecognitionService.
   */
  @OnEvent('attendance.record.created')
  handleAttendanceRecordCreated(payload: {
    sessionId: string;
    record: any;
  }) {
    const room = `session_${payload.sessionId}`;
    this.logger.log(
      `Emitting attendanceUpdated to room ${room} - Student: ${payload.record?.student?.student_code || 'N/A'}`,
    );
    this.server.to(room).emit('attendanceUpdated', {
      type: 'RECORD_CREATED',
      sessionId: payload.sessionId,
      record: payload.record,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Lắng nghe sự kiện nội bộ khi bản ghi điểm danh được cập nhật.
   */
  @OnEvent('attendance.record.updated')
  handleAttendanceRecordUpdated(payload: {
    sessionId: string;
    record: any;
  }) {
    const room = `session_${payload.sessionId}`;
    this.logger.log(
      `Emitting attendanceUpdated (update) to room ${room}`,
    );
    this.server.to(room).emit('attendanceUpdated', {
      type: 'RECORD_UPDATED',
      sessionId: payload.sessionId,
      record: payload.record,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Lắng nghe sự kiện nội bộ khi điểm danh hàng loạt (bulk).
   */
  @OnEvent('attendance.records.bulk_created')
  handleAttendanceBulkCreated(payload: {
    sessionId: string;
    records: any[];
  }) {
    const room = `session_${payload.sessionId}`;
    this.logger.log(
      `Emitting attendanceBulkUpdated to room ${room} - ${payload.records.length} records`,
    );
    this.server.to(room).emit('attendanceBulkUpdated', {
      type: 'RECORDS_BULK_CREATED',
      sessionId: payload.sessionId,
      records: payload.records,
      timestamp: new Date().toISOString(),
    });
  }
}
