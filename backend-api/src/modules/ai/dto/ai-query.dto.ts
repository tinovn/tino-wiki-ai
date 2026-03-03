import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiQueryDto {
  @ApiProperty({ description: 'The question to ask' })
  @IsString()
  @MinLength(1)
  question: string;

  @ApiPropertyOptional({ description: 'Customer ID for personalized answers' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Conversation ID for context' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
