import { Controller, Post, Get, Param, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MasterRoles } from '@common/decorators';
import { TelegramService } from './telegram.service';

@ApiTags('Telegram Bot')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Get list of running Telegram bots.
   */
  @MasterRoles('SUPER_ADMIN')
  @Get('bots')
  getRunningBots() {
    return { bots: this.telegramService.getRunningBots() };
  }

  /**
   * Restart bot for a specific tenant (after config change).
   */
  @MasterRoles('SUPER_ADMIN')
  @Post('bots/:tenantSlug/restart')
  async restartBot(@Param('tenantSlug') tenantSlug: string) {
    await this.telegramService.stopBot(tenantSlug);
    await this.telegramService.startBot(tenantSlug);
    this.logger.log(`Telegram bot restarted for ${tenantSlug}`);
    return { status: 'restarted', tenant: tenantSlug };
  }

  /**
   * Start all bots (useful after deploy or config changes).
   */
  @MasterRoles('SUPER_ADMIN')
  @Post('bots/start-all')
  async startAllBots() {
    const result = await this.telegramService.startAllBots();
    return result;
  }

  /**
   * Stop bot for a specific tenant.
   */
  @MasterRoles('SUPER_ADMIN')
  @Post('bots/:tenantSlug/stop')
  async stopBot(@Param('tenantSlug') tenantSlug: string) {
    await this.telegramService.stopBot(tenantSlug);
    return { status: 'stopped', tenant: tenantSlug };
  }
}
