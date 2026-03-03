import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  private buildKey(tenantId: string, prefix: string, key: string): string {
    return `tenant:${tenantId}:${prefix}:${key}`;
  }

  async get<T>(tenantId: string, prefix: string, key: string): Promise<T | null> {
    const cacheKey = this.buildKey(tenantId, prefix, key);
    return this.redis.getJson<T>(cacheKey);
  }

  async set<T>(
    tenantId: string,
    prefix: string,
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const cacheKey = this.buildKey(tenantId, prefix, key);
    await this.redis.setJson(cacheKey, value, ttlSeconds);
  }

  async del(tenantId: string, prefix: string, key: string): Promise<void> {
    const cacheKey = this.buildKey(tenantId, prefix, key);
    await this.redis.del(cacheKey);
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    await this.redis.delPattern(`tenant:${tenantId}:*`);
  }

  async invalidatePrefix(tenantId: string, prefix: string): Promise<void> {
    await this.redis.delPattern(`tenant:${tenantId}:${prefix}:*`);
  }
}
