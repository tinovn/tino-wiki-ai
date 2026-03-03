import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Allow AI to use general knowledge (admin/staff override)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  allowGeneralKnowledge?: boolean;
}
