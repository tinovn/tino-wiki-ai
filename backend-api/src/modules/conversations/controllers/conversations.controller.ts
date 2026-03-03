import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, CurrentUser, CurrentTenant } from '@common/decorators';
import { ApiResponseDto, PaginationDto } from '@common/dto';
import { ConversationsService } from '../services/conversations.service';
import {
  QueryConversationsDto,
  AgentReplyDto,
  AssignAgentDto,
  UpdateConversationDto,
  CreateNoteDto,
} from '../dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
@Roles('ADMIN', 'AGENT')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(
    @Query() query: QueryConversationsDto,
    @CurrentUser('sub') userId: string,
  ) {
    const { data, total } = await this.conversationsService.findAll(query, userId);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const conversation = await this.conversationsService.findById(id);
    return ApiResponseDto.success(conversation);
  }

  @Get(':id/messages')
  async findMessages(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.conversationsService.findMessages(
      id,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
    return ApiResponseDto.success(messages);
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: AgentReplyDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: any,
  ) {
    const message = await this.conversationsService.sendAgentMessage(
      id,
      user.sub,
      user.displayName || user.email,
      dto.content,
      { id: tenant.id, slug: tenant.slug, databaseUrl: tenant.databaseUrl },
    );
    return ApiResponseDto.success(message);
  }

  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    const conv = await this.conversationsService.assignAgent(id, dto.agentId, tenantId);
    return ApiResponseDto.success(conv);
  }

  @Post(':id/unassign')
  async unassign(
    @Param('id') id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const conv = await this.conversationsService.unassignAgent(id, tenantId);
    return ApiResponseDto.success(conv);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    const conv = await this.conversationsService.updateConversation(id, dto as any, tenantId);
    return ApiResponseDto.success(conv);
  }

  @Post(':id/close')
  async close(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    const conv = await this.conversationsService.closeConversation(id, {
      id: tenant.id, databaseUrl: tenant.databaseUrl, settings: tenant.settings,
    });
    return ApiResponseDto.success(conv);
  }

  @Post(':id/reopen')
  async reopen(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    const conv = await this.conversationsService.reopenConversation(id, {
      id: tenant.id, databaseUrl: tenant.databaseUrl, settings: tenant.settings,
    });
    return ApiResponseDto.success(conv);
  }

  @Post(':id/mark-read')
  async markRead(@Param('id') id: string) {
    await this.conversationsService.markAsRead(id);
    return ApiResponseDto.success({ read: true });
  }

  @Post(':id/resume-ai')
  async resumeAi(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    const conv = await this.conversationsService.resumeAi(id, {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
    });
    return ApiResponseDto.success(conv);
  }

  @Post(':id/ai-suggest')
  async aiSuggest(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    const result = await this.conversationsService.getAiSuggestion(id, {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      settings: tenant.settings,
    });
    return ApiResponseDto.success(result);
  }

  @Get(':id/ecommerce-context')
  async getEcommerceContext(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
  ) {
    const context = await this.conversationsService.getEcommerceContext(id, {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      settings: tenant.settings,
    });
    return ApiResponseDto.success(context);
  }

  @Get(':id/related')
  async findRelated(@Param('id') id: string) {
    const conversations = await this.conversationsService.getCustomerConversations(id);
    return ApiResponseDto.success(conversations);
  }

  @Get(':id/notes')
  async findNotes(@Param('id') id: string) {
    const notes = await this.conversationsService.findNotes(id);
    return ApiResponseDto.success(notes);
  }

  @Post(':id/notes')
  async createNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser('sub') userId: string,
  ) {
    const note = await this.conversationsService.createNote(id, userId, dto.content);
    return ApiResponseDto.success(note);
  }
}
