import { IsString, IsOptional, IsBoolean, IsArray, MinLength } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by document type', enum: ['OFFICIAL', 'GUIDE', 'FAQ', 'REFERENCE', 'INTERNAL', 'PRICING', 'SERVICE'] })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Filter by audience', enum: ['PUBLIC', 'INTERNAL', 'AGENT'] })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
