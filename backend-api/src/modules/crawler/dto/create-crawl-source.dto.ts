import { IsString, IsOptional, IsArray, IsIn, IsObject, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCrawlSourceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: ['URL', 'SITEMAP', 'RSS', 'API'] })
  @IsIn(['URL', 'SITEMAP', 'RSS', 'API'])
  type: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  url: string;

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
}
