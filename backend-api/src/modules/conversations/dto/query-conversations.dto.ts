import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryConversationsDto {
  @ApiPropertyOptional({ enum: ['mine', 'unassigned', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['mine', 'unassigned', 'all'])
  view?: 'mine' | 'unassigned' | 'all' = 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'CLOSED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'CLOSED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
