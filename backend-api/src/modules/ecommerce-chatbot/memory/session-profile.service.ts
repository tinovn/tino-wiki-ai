import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';
import { CustomerProfile } from '../interfaces/graph-state.interface';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

@Injectable()
export class SessionProfileService {
  private readonly logger = new Logger(SessionProfileService.name);

  constructor(private readonly redis: RedisService) {}

  private getKey(tenantId: string, customerId: string): string {
    return `${ECOMMERCE_CONSTANTS.REDIS_PROFILE_PREFIX}:${tenantId}:${customerId}`;
  }

  async getProfile(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerProfile> {
    const key = this.getKey(tenantId, customerId);
    const cached = await this.redis.getJson<CustomerProfile>(key);

    if (cached) {
      this.logger.debug(
        `Loaded profile for customer ${customerId} from Redis`,
      );
      return cached;
    }

    return this.createEmptyProfile();
  }

  async saveProfile(
    tenantId: string,
    customerId: string,
    profile: CustomerProfile,
  ): Promise<void> {
    const key = this.getKey(tenantId, customerId);
    profile.lastVisit = new Date();
    await this.redis.setJson(key, profile, ECOMMERCE_CONSTANTS.REDIS_PROFILE_TTL);
    this.logger.debug(`Saved profile for customer ${customerId} to Redis`);
  }

  async updateProfile(
    tenantId: string,
    customerId: string,
    updates: Partial<CustomerProfile>,
  ): Promise<CustomerProfile> {
    const existing = await this.getProfile(tenantId, customerId);
    const merged: CustomerProfile = {
      ...existing,
      ...updates,
      preferences: {
        ...existing.preferences,
        ...(updates.preferences ?? {}),
      },
      productInterests: [
        ...new Set([
          ...existing.productInterests,
          ...(updates.productInterests ?? []),
        ]),
      ],
      issueHistory: [
        ...new Set([
          ...existing.issueHistory,
          ...(updates.issueHistory ?? []),
        ]),
      ],
      lastVisit: new Date(),
    };

    await this.saveProfile(tenantId, customerId, merged);
    return merged;
  }

  async deleteProfile(
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const key = this.getKey(tenantId, customerId);
    await this.redis.del(key);
  }

  private createEmptyProfile(): CustomerProfile {
    return {
      preferences: {},
      productInterests: [],
      issueHistory: [],
    };
  }
}
