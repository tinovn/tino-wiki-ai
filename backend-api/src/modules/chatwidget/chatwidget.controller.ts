import { Controller, Post, Get, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@common/decorators';
import { WidgetTokenGuard } from '@common/guards/widget-token.guard';
import { ApiResponseDto } from '@common/dto';
import { ChatWidgetService } from './chatwidget.service';
import { InitSessionDto } from './dto/init-session.dto';
import { WidgetMessageDto } from './dto/widget-message.dto';

@ApiTags('Chat Widget')
@Controller('widget/chat')
@Public()
@UseGuards(WidgetTokenGuard)
export class ChatWidgetController {
  constructor(private readonly chatWidgetService: ChatWidgetService) {}

  @Post('init')
  async initSession(@Body() dto: InitSessionDto, @Req() req: any) {
    const result = await this.chatWidgetService.initSession(req.tenant, dto);
    return ApiResponseDto.success(result);
  }

  @Post('message')
  async sendMessage(@Body() dto: WidgetMessageDto, @Req() req: any) {
    const result = await this.chatWidgetService.sendMessage(req.tenant, dto);
    return ApiResponseDto.success(result);
  }

  @Post('message/stream')
  async sendMessageStream(
    @Body() dto: WidgetMessageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = this.chatWidgetService.sendMessageStream(req.tenant, dto);

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

  @Get('history/:sessionId')
  async getHistory(@Param('sessionId') sessionId: string, @Req() req: any) {
    const result = await this.chatWidgetService.getHistory(req.tenant, sessionId);
    return ApiResponseDto.success(result);
  }
}
