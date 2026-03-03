import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { PrismaClientManager } from '@core/database/prisma/prisma-client.manager';
import {
  CONVERSATION_EVENTS,
  ConversationNewMessagePayload,
  ConversationUpdatedPayload,
  ConversationHandoffPayload,
} from '../interfaces/conversation-events.interface';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string;
    tenantDatabaseUrl?: string;
    displayName?: string;
  };
}

@WebSocketGateway({
  namespace: '/ws/conversations',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConversationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationsGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly clientManager: PrismaClientManager,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const tenantId = client.handshake.auth?.tenantId || client.handshake.headers?.['x-tenant-id'];

      if (!token || !tenantId) {
        this.logger.warn('WebSocket connection rejected: missing token or tenantId');
        client.disconnect();
        return;
      }

      // Verify JWT
      const secret = this.configService.get<string>('JWT_SECRET') || 'jwt-secret';
      const payload = jwt.verify(token, secret) as { sub: string; tenantId: string; displayName?: string };

      if (payload.tenantId !== tenantId) {
        this.logger.warn('WebSocket connection rejected: tenantId mismatch');
        client.disconnect();
        return;
      }

      // Store user data
      client.data = {
        userId: payload.sub,
        tenantId,
        displayName: payload.displayName,
      };

      // Join tenant room
      await client.join(`tenant:${tenantId}`);

      this.logger.log(`Agent ${payload.sub} connected to tenant:${tenantId}`);
    } catch (error: any) {
      this.logger.warn(`WebSocket auth failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data?.userId) {
      this.logger.log(`Agent ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.join(`conversation:${data.conversationId}`);
    this.logger.debug(`Agent ${client.data.userId} joined conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing to others in the conversation room
    client.to(`conversation:${data.conversationId}`).emit('typing', {
      userId: client.data.userId,
      displayName: client.data.displayName,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; tenantDatabaseUrl: string },
  ) {
    try {
      const db = await this.clientManager.getClient(data.tenantDatabaseUrl);
      await db.conversation.update({
        where: { id: data.conversationId },
        data: { unreadCount: 0 },
      });
    } catch (error: any) {
      this.logger.error(`Failed to mark read: ${error.message}`);
    }
  }

  // --- Event listeners ---

  @OnEvent(CONVERSATION_EVENTS.NEW_MESSAGE)
  handleNewMessage(payload: ConversationNewMessagePayload) {
    // Broadcast to tenant room and conversation room
    this.server.to(`tenant:${payload.tenantId}`).emit('new_message', payload);
    this.server.to(`conversation:${payload.conversationId}`).emit('new_message', payload);
  }

  @OnEvent(CONVERSATION_EVENTS.UPDATED)
  handleConversationUpdated(payload: ConversationUpdatedPayload) {
    this.server.to(`tenant:${payload.tenantId}`).emit('conversation_updated', payload);
  }

  @OnEvent(CONVERSATION_EVENTS.CREATED)
  handleConversationCreated(payload: ConversationNewMessagePayload) {
    this.server.to(`tenant:${payload.tenantId}`).emit('conversation_created', payload);
  }

  @OnEvent(CONVERSATION_EVENTS.HANDOFF)
  handleHandoff(payload: ConversationHandoffPayload) {
    this.server.to(`tenant:${payload.tenantId}`).emit('conversation_handoff', payload);
  }
}
