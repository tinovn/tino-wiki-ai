import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@core/redis/redis.service';

export interface AgentPresence {
  userId: string;
  socketId: string;
  displayName?: string;
  connectedAt: string;
}

const PRESENCE_TTL = 86400; // 24h auto-cleanup
const MAX_CONNECTIONS_PER_TENANT = 200;

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private readonly redis: RedisService) {}

  async trackConnection(
    tenantId: string,
    userId: string,
    socketId: string,
    displayName?: string,
  ): Promise<void> {
    const client = this.redis.getClient();
    const presenceKey = `presence:${tenantId}`;
    const connectionsKey = `connections:${tenantId}`;

    const data: AgentPresence = {
      userId,
      socketId,
      displayName,
      connectedAt: new Date().toISOString(),
    };

    await client
      .pipeline()
      .hset(presenceKey, userId, JSON.stringify(data))
      .sadd(connectionsKey, socketId)
      .expire(presenceKey, PRESENCE_TTL)
      .expire(connectionsKey, PRESENCE_TTL)
      .exec();

    this.logger.debug(`Tracked connection: ${userId} in tenant:${tenantId}`);
  }

  async trackDisconnection(
    tenantId: string,
    userId: string,
    socketId: string,
  ): Promise<void> {
    const client = this.redis.getClient();
    const presenceKey = `presence:${tenantId}`;
    const connectionsKey = `connections:${tenantId}`;

    await client
      .pipeline()
      .hdel(presenceKey, userId)
      .srem(connectionsKey, socketId)
      .exec();

    this.logger.debug(`Tracked disconnection: ${userId} from tenant:${tenantId}`);
  }

  async getOnlineAgents(tenantId: string): Promise<AgentPresence[]> {
    const client = this.redis.getClient();
    const data = await client.hgetall(`presence:${tenantId}`);
    return Object.values(data).map((v) => JSON.parse(v) as AgentPresence);
  }

  async getConnectionCount(tenantId: string): Promise<number> {
    const client = this.redis.getClient();
    return client.scard(`connections:${tenantId}`);
  }

  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    const client = this.redis.getClient();
    return (await client.hexists(`presence:${tenantId}`, userId)) === 1;
  }

  getMaxConnectionsPerTenant(): number {
    return MAX_CONNECTIONS_PER_TENANT;
  }
}
