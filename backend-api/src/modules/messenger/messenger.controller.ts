import { Controller, Get, Post, Query, Body, Req, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Public } from '@common/decorators';
import { MessengerService } from './messenger.service';
import { FacebookWebhookDto } from './dto/facebook-webhook.dto';

@ApiTags('Messenger Webhook')
@Controller('webhooks/messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(
    private readonly messengerService: MessengerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Facebook webhook verification (challenge-response).
   * Called once when setting up webhook in FB Developer Console.
   */
  @Public()
  @Get()
  verifyWebhook(@Query() query: any, @Res() res: Response) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const verifyToken = this.configService.get<string>('FB_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('FB webhook verified successfully');
      return res.status(200).send(challenge);
    }

    this.logger.warn(`FB webhook verification failed: mode=${mode}, token=${token}`);
    return res.status(403).send('Forbidden');
  }

  /**
   * Incoming messages from Facebook Messenger.
   * Returns 200 immediately (fire-and-forget) to avoid FB 20s timeout.
   */
  @Public()
  @Post()
  async handleWebhook(@Body() body: FacebookWebhookDto, @Req() req: any) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody: Buffer = req.rawBody;

    // Fire-and-forget: process async, return 200 immediately
    this.messengerService.handleWebhook(body, rawBody, signature).catch((err) => {
      this.logger.error('FB webhook processing error', err);
    });

    return { status: 'ok' };
  }
}
