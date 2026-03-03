import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InitSessionDto {
  @ApiPropertyOptional({ description: 'Existing session ID to resume' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Visitor display name' })
  @IsOptional()
  @IsString()
  visitorName?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (page URL, referrer, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
