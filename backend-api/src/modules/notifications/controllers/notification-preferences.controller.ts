import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';
import { UpdateNotificationPreferencesDto } from '../dto/update-preferences.dto';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notification preferences' })
  async getPreferences(@Req() req: any) {
    const userId = req.user.sub;
    const db = await this.tenantPrisma.getClient();

    const preferences = await (db as any).notificationPreference.findUnique({
      where: { userId },
    });

    // Return defaults if no preferences set yet
    if (!preferences) {
      return {
        id: '',
        userId,
        desktopEnabled: true,
        mobilePushEnabled: true,
        soundEnabled: true,
        newMessageEnabled: true,
        handoffEnabled: true,
        assignmentEnabled: true,
        mutedConversations: [],
      };
    }

    return preferences;
  }

  @Patch()
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Req() req: any, @Body() dto: UpdateNotificationPreferencesDto) {
    const userId = req.user.sub;
    const db = await this.tenantPrisma.getClient();

    const preferences = await (db as any).notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });

    return preferences;
  }
}
