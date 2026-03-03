import { Logger, OnModuleDestroy } from '@nestjs/common';
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
import { RedisService } from '@core/redis/redis.service';
import { PresenceService } from '../services/presence.service';
import {
  CONVERSATION_EVENTS,
  ConversationNewMessagePayload,
  ConversationUpdatedPayload,
  ConversationHandoffPayload,
  ConversationEcommercePayload,
} from '../interfaces/conversation-events.interface';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string;
    tenantDatabaseUrl?: string;
    displayName?: string;
  };
}

// Rate limit: actions per 60-second window
const RATE_LIMITS: Record<string, number> = {
  typing: 30,
  mark_read: 60,
  join_conversation: 30,
};

@WebSocketGateway({
  namespace: '/ws/conversations',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationsGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly clientManager: PrismaClientManager,
    private readonly presenceService: PresenceService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const tenantId = client.handshake.auth?.tenantId || client.handshake.headers?.['x-tenant-id'];

      if (!token || !tenantId) {
        this.logger.warn('WebSocket connection rejected: missing token or tenantId');
        client.emit('error', { message: 'Missing authentication token or tenantId' });
        client.disconnect(true);
        return;
      }

      // Verify JWT
      const secret = this.configService.get<string>('jwt.secret') || 'change-me';
      let payload: { sub: string; tenantId: string; displayName?: string };
      try {
        payload = jwt.verify(token, secret) as { sub: string; tenantId: string; displayName?: string };
      } catch (jwtError: any) {
        this.logger.warn(`WebSocket JWT verification failed: ${jwtError.message}`);
        client.emit('error', { message: 'Invalid or expired token', code: 'TOKEN_EXPIRED' });
        client.disconnect(true);
        return;
      }

      if (payload.tenantId !== tenantId) {
        this.logger.warn('WebSocket connection rejected: tenantId mismatch');
        client.emit('error', { message: 'Tenant ID mismatch' });
        client.disconnect(true);
        return;
      }

      // Check per-tenant connection limit
      const connectionCount = await this.presenceService.getConnectionCount(tenantId);
      const maxConnections = this.presenceService.getMaxConnectionsPerTenant();
      if (connectionCount >= maxConnections) {
        this.logger.warn(`Tenant ${tenantId} reached connection limit (${maxConnections})`);
        client.emit('error', { message: 'Connection limit reached', code: 'CONN_LIMIT' });
        client.disconnect(true);
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

      // Track presence
      await this.presenceService.trackConnection(
        tenantId,
        payload.sub,
        client.id,
        payload.displayName,
      );

      // Notify others in tenant
      client.to(`tenant:${tenantId}`).emit('agent_online', {
        userId: payload.sub,
        displayName: payload.displayName,
      });

      this.logger.log(`Agent ${payload.sub} connected to tenant:${tenantId}`);
    } catch (error: any) {
      this.logger.warn(`WebSocket auth failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.data?.userId) {
      const { userId, tenantId, displayName } = client.data;

      await this.presenceService.trackDisconnection(tenantId, userId, client.id);

      // Notify others in tenant
      this.server.to(`tenant:${tenantId}`).emit('agent_offline', {
        userId,
        displayName,
      });

      this.logger.log(`Agent ${userId} disconnected from tenant:${tenantId}`);
    }
  }

  async onModuleDestroy() {
    if (this.server) {
      this.server.disconnectSockets(true);
      this.logger.log('All WebSocket connections closed (graceful shutdown)');
    }
  }

  // --- Rate limiting helper ---

  private async checkRateLimit(
    tenantId: string,
    userId: string,
    action: string,
  ): Promise<boolean> {
    const limit = RATE_LIMITS[action];
    if (!limit) return true;

    const key = `ws:rate:${tenantId}:${userId}:${action}`;
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, 60);
    return count <= limit;
  }

  // --- Client message handlers ---

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!(await this.checkRateLimit(client.data.tenantId, client.data.userId, 'join_conversation'))) {
      return;
    }
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
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!(await this.checkRateLimit(client.data.tenantId, client.data.userId, 'typing'))) {
      return;
    }
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
    if (!(await this.checkRateLimit(client.data.tenantId, client.data.userId, 'mark_read'))) {
      return;
    }
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

  @SubscribeMessage('get_online_agents')
  async handleGetOnlineAgents(@ConnectedSocket() client: AuthenticatedSocket) {
    const agents = await this.presenceService.getOnlineAgents(client.data.tenantId);
    return { event: 'online_agents', data: agents };
  }

  // --- Event listeners (EventEmitter2 -> Socket.IO broadcast via Redis adapter) ---

  @OnEvent(CONVERSATION_EVENTS.NEW_MESSAGE)
  handleNewMessage(payload: ConversationNewMessagePayload) {
    // Broadcast to tenant room only — agents join tenant room on connect,
    // so emitting to both tenant + conversation rooms causes duplicate delivery
    this.server.to(`tenant:${payload.tenantId}`).emit('new_message', payload);
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

  @OnEvent(CONVERSATION_EVENTS.ECOMMERCE)
  handleEcommerceEvent(payload: ConversationEcommercePayload) {
    this.server.to(`tenant:${payload.tenantId}`).emit('ecommerce_event', payload);
  }
}
