import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemoryEntryDto {
  @ApiProperty({ enum: ['PREFERENCE', 'PRODUCT_INTEREST', 'ISSUE_HISTORY', 'NOTE', 'CONTEXT'] })
  @IsIn(['PREFERENCE', 'PRODUCT_INTEREST', 'ISSUE_HISTORY', 'NOTE', 'CONTEXT'])
  type: string;

  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ enum: ['AI_EXTRACTED', 'AGENT_MANUAL', 'SYSTEM'] })
  @IsOptional()
  @IsIn(['AI_EXTRACTED', 'AGENT_MANUAL', 'SYSTEM'])
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
