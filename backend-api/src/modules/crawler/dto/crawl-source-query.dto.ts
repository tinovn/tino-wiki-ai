import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto';

export class CrawlSourceQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['URL', 'SITEMAP', 'RSS', 'API'] })
  @IsOptional()
  @IsIn(['URL', 'SITEMAP', 'RSS', 'API'])
  type?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'PAUSED', 'ERROR'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'ERROR'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
