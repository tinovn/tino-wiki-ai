import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerMemoryService } from '../services/customer-memory.service';
import { ConversationHistoryService } from '../services/conversation-history.service';
import { PreferenceExtractorService } from '../services/preference-extractor.service';
import { CreateMemoryEntryDto } from '../dto/create-memory-entry.dto';
import { ConversationMessageDto } from '../dto/conversation-message.dto';
import { ApiResponseDto } from '@common/dto';
import { Roles } from '@common/decorators';

@ApiTags('Customer Memory')
@ApiBearerAuth()
@Controller('customers/:customerId')
@Roles('ADMIN', 'AGENT')
export class CustomerMemoryController {
  constructor(
    private readonly memoryService: CustomerMemoryService,
    private readonly conversationService: ConversationHistoryService,
    private readonly preferenceExtractor: PreferenceExtractorService,
  ) {}

  // Memory endpoints
  @Get('memories')
  async getMemories(@Param('customerId') customerId: string) {
    const memories = await this.memoryService.getMemories(customerId);
    return ApiResponseDto.success(memories);
  }

  @Post('memories')
  async addMemory(
    @Param('customerId') customerId: string,
    @Body() dto: CreateMemoryEntryDto,
  ) {
    const memory = await this.memoryService.addMemory(customerId, dto);
    return ApiResponseDto.success(memory);
  }

  @Patch('memories/:memoryId')
  async updateMemory(
    @Param('memoryId') memoryId: string,
    @Body() dto: Partial<CreateMemoryEntryDto>,
  ) {
    const memory = await this.memoryService.updateMemory(memoryId, dto);
    return ApiResponseDto.success(memory);
  }

  @Delete('memories/:memoryId')
  async deleteMemory(@Param('memoryId') memoryId: string) {
    await this.memoryService.deleteMemory(memoryId);
    return ApiResponseDto.success({ deleted: true });
  }

  // Conversation endpoints
  @Get('conversations')
  async getConversations(@Param('customerId') customerId: string) {
    const conversations = await this.conversationService.getConversations(customerId);
    return ApiResponseDto.success(conversations);
  }

  @Post('conversations')
  async createConversation(@Param('customerId') customerId: string) {
    const conversation = await this.conversationService.createConversation(customerId);
    return ApiResponseDto.success(conversation);
  }

  @Get('conversations/:convId/messages')
  async getMessages(@Param('convId') convId: string) {
    const messages = await this.conversationService.getMessages(convId);
    return ApiResponseDto.success(messages);
  }

  @Post('conversations/:convId/messages')
  async addMessage(
    @Param('convId') convId: string,
    @Body() dto: ConversationMessageDto,
    @Req() req: any,
  ) {
    const tenant = req.tenant || {};
    const message = await this.conversationService.addMessage(
      convId, dto, tenant.id, tenant.databaseUrl,
    );
    return ApiResponseDto.success(message);
  }

  @Post('conversations/:convId/close')
  async closeConversation(@Param('convId') convId: string) {
    const conversation = await this.conversationService.closeConversation(convId);
    return ApiResponseDto.success(conversation);
  }

  // Preference extraction
  @Post('extract-preferences')
  async extractPreferences(@Param('customerId') customerId: string, @Req() req: any) {
    const tenant = req.tenant || {};
    // Get recent conversations and extract preferences
    const conversations = await this.conversationService.getConversations(customerId);
    if (conversations.length === 0) {
      return ApiResponseDto.success({ extracted: [] });
    }

    const latestConv = conversations[0];
    const messages = await this.conversationService.getMessages(latestConv.id);
    const extracted = await this.preferenceExtractor.extractFromMessages(
      customerId,
      messages.map((m) => ({ role: m.role, content: m.content })),
    );

    return ApiResponseDto.success({ extracted });
  }
}
