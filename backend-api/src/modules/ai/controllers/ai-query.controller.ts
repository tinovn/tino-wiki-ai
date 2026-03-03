import { Controller, Post, Get, Param, Body, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { QueryEngineService } from '../services/query-engine.service';
import { AiQueryDto } from '../dto/ai-query.dto';
import { ApiResponseDto } from '@common/dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiQueryController {
  constructor(private readonly queryEngine: QueryEngineService) {}

  @Post('query')
  async query(@Body() dto: AiQueryDto, @Req() req: any) {
    const tenant = req.tenant || {};
    const result = await this.queryEngine.query({
      tenantId: tenant.id || req.headers['x-tenant-id'],
      tenantSlug: tenant.slug || 'default',
      tenantDatabaseUrl: tenant.databaseUrl || '',
      question: dto.question,
      customerId: dto.customerId,
    });

    return ApiResponseDto.success(result);
  }

  @Post('query/stream')
  async queryStream(@Body() dto: AiQueryDto, @Req() req: any, @Res() res: Response) {
    const tenant = req.tenant || {};

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
