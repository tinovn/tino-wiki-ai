import { Controller, Post, Delete, Body, Req, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';
import { RegisterPushDto, UnregisterPushDto } from '../dto/register-push.dto';
import { WebPushService } from '../services/web-push.service';

@ApiTags('Push Subscriptions')
@ApiBearerAuth()
@Controller('push-subscriptions')
export class PushSubscriptionController {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly webPushService: WebPushService,
  ) {}

  @Get('vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for Web Push subscription' })
  getVapidKey() {
    return { publicKey: this.webPushService.getVapidPublicKey() };
  }

  @Post()
  @ApiOperation({ summary: 'Register a push subscription' })
  async register(@Req() req: any, @Body() dto: RegisterPushDto) {
    const userId = req.user.sub;
    const db = await this.tenantPrisma.getClient();

    const subscription = await (db as any).pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint: dto.endpoint },
      },
      update: {
        type: dto.type,
        keys: dto.keys || {},
        userAgent: dto.userAgent,
        isActive: true,
      },
      create: {
        userId,
        type: dto.type,
        endpoint: dto.endpoint,
        keys: dto.keys || {},
        userAgent: dto.userAgent,
      },
    });

    return { id: subscription.id, message: 'Push subscription registered' };
  }

  @Delete()
  @ApiOperation({ summary: 'Unregister a push subscription' })
  async unregister(@Req() req: any, @Body() dto: UnregisterPushDto) {
    const userId = req.user.sub;
    const db = await this.tenantPrisma.getClient();

    await (db as any).pushSubscription.deleteMany({
      where: { userId, endpoint: dto.endpoint },
    });

    return { message: 'Push subscription removed' };
  }
}
