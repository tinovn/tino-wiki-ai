import { Controller, Post, Get, Patch, Body, Req, Res, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { QueryEngineService } from '../services/query-engine.service';
import { AiQueryDto } from '../dto/ai-query.dto';
import { ApiResponseDto } from '@common/dto';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { Roles } from '@common/decorators';
import { DEFAULT_MESSAGES, TenantMessageKey } from '@common/utils';
import { TelegramService } from '@modules/telegram/telegram.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiQueryController {
  private readonly logger = new Logger(AiQueryController.name);

  constructor(
    private readonly queryEngine: QueryEngineService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  @Get('settings')
  async getSettings(@Req() req: any) {
    const tenant = req.tenant || {};
    const settings = tenant.settings || {};
    return ApiResponseDto.success({
      allowGeneralKnowledge: settings.ai?.allowGeneralKnowledge ?? false,
    });
  }

  @Patch('settings')
  @Roles('ADMIN')
  async updateSettings(@Body() body: { allowGeneralKnowledge?: boolean }, @Req() req: any) {
    const tenantId = req.tenant?.id;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (typeof tenant!.settings === 'string'
      ? JSON.parse(tenant!.settings)
      : tenant!.settings) || {};

    currentSettings.ai = {
      ...currentSettings.ai,
      ...(body.allowGeneralKnowledge !== undefined && { allowGeneralKnowledge: body.allowGeneralKnowledge }),
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: currentSettings },
    });

    return ApiResponseDto.success(currentSettings.ai);
  }

  @Get('channels')
  @Roles('ADMIN')
  async getChannels(@Req() req: any) {
    const tenant = req.tenant || {};
    const settings = tenant.settings || {};
    return ApiResponseDto.success({
      messenger: settings.messenger || null,
      telegram: settings.telegram || null,
      chatwidget: settings.chatwidget || null,
    });
  }

  @Patch('channels')
  @Roles('ADMIN')
  async updateChannels(
    @Body() body: { messenger?: any; telegram?: any; chatwidget?: any },
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (typeof tenant!.settings === 'string'
      ? JSON.parse(tenant!.settings)
      : tenant!.settings) || {};

    if (body.messenger !== undefined) {
      currentSettings.messenger = body.messenger;
    }
    if (body.telegram !== undefined) {
      currentSettings.telegram = body.telegram;
    }
    if (body.chatwidget !== undefined) {
      currentSettings.chatwidget = body.chatwidget;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: currentSettings },
    });

    // Auto restart/stop Telegram bot when config changes
    if (body.telegram !== undefined) {
      const tenantSlug = req.tenant?.slug;
      if (tenantSlug) {
        try {
          if (body.telegram?.botToken) {
            await this.telegramService.startBot(tenantSlug, body.telegram.botToken);
            this.logger.log(`Telegram bot auto-started for ${tenantSlug}`);
          } else {
            await this.telegramService.stopBot(tenantSlug);
            this.logger.log(`Telegram bot stopped for ${tenantSlug}`);
          }
        } catch (err: any) {
          this.logger.error(`Failed to restart Telegram bot for ${tenantSlug}: ${err.message}`);
        }
      }
    }

    return ApiResponseDto.success({
      messenger: currentSettings.messenger || null,
      telegram: currentSettings.telegram || null,
      chatwidget: currentSettings.chatwidget || null,
    });
  }

  @Post('channels/chatwidget/generate-token')
  @Roles('ADMIN')
  async generateWidgetToken(@Req() req: any) {
    const tenantId = req.tenant?.id;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (typeof tenant!.settings === 'string'
      ? JSON.parse(tenant!.settings)
      : tenant!.settings) || {};

    const widgetToken = 'wt_' + crypto.randomBytes(24).toString('hex');

    currentSettings.chatwidget = {
      ...currentSettings.chatwidget,
      widgetToken,
      enabled: currentSettings.chatwidget?.enabled ?? true,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: currentSettings },
    });

    return ApiResponseDto.success({ widgetToken });
  }

  @Get('messages')
  @Roles('ADMIN')
  async getMessages(@Req() req: any) {
    const settings = req.tenant?.settings || {};
    return ApiResponseDto.success({
      global: settings.messages || {},
      messenger: settings.messenger?.messages || {},
      telegram: settings.telegram?.messages || {},
      chatwidget: settings.chatwidget?.messages || {},
      defaults: DEFAULT_MESSAGES,
    });
  }

  @Patch('messages')
  @Roles('ADMIN')
  async updateMessages(
    @Body() body: {
      global?: Partial<Record<TenantMessageKey, string>>;
      messenger?: Partial<Record<TenantMessageKey, string>>;
      telegram?: Partial<Record<TenantMessageKey, string>>;
      chatwidget?: Partial<Record<TenantMessageKey, string>>;
    },
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (typeof tenant!.settings === 'string'
      ? JSON.parse(tenant!.settings)
      : tenant!.settings) || {};

    if (body.global) {
      currentSettings.messages = { ...currentSettings.messages, ...body.global };
    }

    for (const ch of ['messenger', 'telegram', 'chatwidget'] as const) {
      if (body[ch]) {
        currentSettings[ch] = currentSettings[ch] || {};
        currentSettings[ch].messages = { ...currentSettings[ch]?.messages, ...body[ch] };
      }
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: currentSettings },
    });

    return ApiResponseDto.success({
      global: currentSettings.messages || {},
      messenger: currentSettings.messenger?.messages || {},
      telegram: currentSettings.telegram?.messages || {},
      chatwidget: currentSettings.chatwidget?.messages || {},
    });
  }

  @Post('query')
  async query(@Body() dto: AiQueryDto, @Req() req: any) {
    const tenant = req.tenant || {};

    // Admin/staff gửi dto.allowGeneralKnowledge → override tenant setting
    const allowGeneral = dto.allowGeneralKnowledge ?? false;

    const result = await this.queryEngine.query({
      tenantId: tenant.id || req.headers['x-tenant-id'],
      tenantSlug: tenant.slug || 'default',
      tenantDatabaseUrl: tenant.databaseUrl || '',
      question: dto.question,
      customerId: dto.customerId,
      allowGeneralKnowledge: allowGeneral,
      categoryId: dto.categoryId,
      documentType: dto.documentType,
      audience: dto.audience,
      tags: dto.tags,
    });

    return ApiResponseDto.success(result);
  }

  @Post('query/stream')
  async queryStream(@Body() dto: AiQueryDto, @Req() req: any, @Res() res: Response) {
    const tenant = req.tenant || {};

    // Admin/staff gửi dto.allowGeneralKnowledge → override tenant setting
    const allowGeneral = dto.allowGeneralKnowledge ?? false;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = this.queryEngine.queryStream({
        tenantId: tenant.id || req.headers['x-tenant-id'],
        tenantSlug: tenant.slug || 'default',
        tenantDatabaseUrl: tenant.databaseUrl || '',
        question: dto.question,
        customerId: dto.customerId,
        allowGeneralKnowledge: allowGeneral,
        categoryId: dto.categoryId,
        documentType: dto.documentType,
        audience: dto.audience,
        tags: dto.tags,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        if (chunk.isLast) break;
      }

      res.write('data: [DONE]\n\n');
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ content: `Error: ${err.message}`, isLast: true })}\n\n`);
      res.write('data: [DONE]\n\n');
    }
    res.end();
  }
}
