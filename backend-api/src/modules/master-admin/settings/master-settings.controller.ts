import { Controller, Get, Patch, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ApiResponseDto } from '@common/dto';
import { SuperAdminOnly } from '@common/decorators';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Master - Settings')
@ApiBearerAuth()
@Controller('master/settings')
@SuperAdminOnly()
export class MasterSettingsController {
  private readonly logger = new Logger(MasterSettingsController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get('llm')
  getLlmConfig() {
    const config = {
      defaultProvider: this.configService.get<string>('llm.defaultProvider'),
      vllm: {
        baseUrl: this.configService.get<string>('llm.vllm.baseUrl'),
        model: this.configService.get<string>('llm.vllm.model'),
        apiKey: this.maskKey(this.configService.get<string>('llm.vllm.apiKey')),
      },
      openai: {
        apiKey: this.maskKey(this.configService.get<string>('llm.openai.apiKey')),
        chatModel: this.configService.get<string>('llm.openai.chatModel'),
        embeddingModel: this.configService.get<string>('llm.openai.embeddingModel'),
      },
      anthropic: {
        apiKey: this.maskKey(this.configService.get<string>('llm.anthropic.apiKey')),
        model: this.configService.get<string>('llm.anthropic.model'),
      },
      ollama: {
        baseUrl: this.configService.get<string>('llm.ollama.baseUrl'),
        chatModel: this.configService.get<string>('llm.ollama.chatModel'),
        embeddingModel: this.configService.get<string>('llm.ollama.embeddingModel'),
      },
      embedding: {
        provider: this.configService.get<string>('embedding.provider'),
        dimensions: this.configService.get<number>('embedding.dimensions'),
      },
    };
    return ApiResponseDto.success(config);
  }

  @Patch('llm')
  updateLlmConfig(@Body() dto: Record<string, string>) {
    // Resolve .env path from project root (works from both src/ and dist/)
    const envPath = path.resolve(process.cwd(), '.env');
    this.logger.log(`Updating .env at: ${envPath}`);

    let envContent = fs.readFileSync(envPath, 'utf-8');

    const envMap: Record<string, string> = {
      defaultProvider: 'LLM_DEFAULT_PROVIDER',
      vllmBaseUrl: 'VLLM_BASE_URL',
      vllmModel: 'VLLM_MODEL',
      vllmApiKey: 'VLLM_API_KEY',
      openaiApiKey: 'OPENAI_API_KEY',
      openaiChatModel: 'OPENAI_CHAT_MODEL',
      openaiEmbeddingModel: 'OPENAI_EMBEDDING_MODEL',
      anthropicApiKey: 'ANTHROPIC_API_KEY',
      anthropicModel: 'CLAUDE_MODEL',
      ollamaBaseUrl: 'OLLAMA_BASE_URL',
      ollamaChatModel: 'OLLAMA_CHAT_MODEL',
      ollamaEmbeddingModel: 'OLLAMA_EMBEDDING_MODEL',
      embeddingProvider: 'EMBEDDING_PROVIDER',
      embeddingDimensions: 'EMBEDDING_DIMENSIONS',
    };

    const changes: string[] = [];
    for (const [key, value] of Object.entries(dto)) {
      const envKey = envMap[key];
      if (!envKey) continue;

      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKey}=${value}`);
      } else {
        envContent += `\n${envKey}=${value}`;
      }
      changes.push(`${envKey}=${value}`);
    }

    fs.writeFileSync(envPath, envContent);
    this.logger.log(`Updated .env: ${changes.join(', ')}`);

    // Auto-restart: exit process, let the process manager (npm run start:dev / nodemon) restart
    setTimeout(() => {
      this.logger.log('Restarting server to apply new config...');
      process.exit(0);
    }, 500);

    return ApiResponseDto.success({ updated: true, restarting: true });
  }

  private maskKey(key?: string): string {
    if (!key || key.length < 8) return key ? '***' : '';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }
}
