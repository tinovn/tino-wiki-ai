import { Controller, Post, Body, Param, Req, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@common/decorators';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './dto/telegram-webhook.dto';

@ApiTags('Telegram Webhook')
@Controller('webhooks/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register webhook URL with Telegram for a tenant.
   * Must be declared BEFORE :tenantSlug to avoid route conflict.
   */
  @Public()
  @Post(':tenantSlug/setup')
  async setupWebhook(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: { baseUrl?: string },
    @Req() req: any,
  ) {
    const appUrl = body?.baseUrl
      || this.configService.get<string>('app.url')
      || this.configService.get<string>('APP_URL')
      || `${req.protocol}://${req.get('host')}`;

    const result = await this.telegramService.setupWebhook(tenantSlug, appUrl);
    this.logger.log(`Telegram webhook setup for ${tenantSlug}: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Incoming messages from Telegram Bot.
   * Returns 200 immediately (fire-and-forget) to avoid Telegram timeout.
   */
  @Public()
  @Post(':tenantSlug')
  async handleWebhook(
    @Param('tenantSlug') tenantSlug: string,
    @Body() body: TelegramUpdate,
    @Req() req: any,
  ) {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;

    // Fire-and-forget: process async, return 200 immediately
    this.telegramService.handleWebhook(tenantSlug, body, secretToken).catch((err) => {
      this.logger.error(`Telegram webhook processing error for ${tenantSlug}`, err);
    });

    return { status: 'ok' };
  }
}
