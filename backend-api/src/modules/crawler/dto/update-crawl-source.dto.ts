import { IsString, IsOptional, IsArray, IsIn, IsObject, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCrawlSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Cron expression for scheduled crawl' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'PAUSED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED'])
  status?: string;
}
